const mongoose = require('mongoose');
const logger = require('../utils/logger');
const activityLogService = require('./activityLog');

/**
 * Multi-stage Payment Service
 * Handles complex payment workflows with multiple receipts and verification stages
 */
class MultiStagePaymentService {
    constructor() {
        this.paymentStatuses = {
            PENDING: 'در انتظار',
            PARTIAL: 'پرداخت جزئی',
            COMPLETED: 'پرداخت کامل',
            VERIFIED: 'تایید شده',
            REJECTED: 'رد شده',
            CANCELLED: 'لغو شده'
        };

        this.receiptStatuses = {
            UPLOADED: 'آپلود شده',
            VERIFIED: 'تایید شده',
            REJECTED: 'رد شده'
        };
    }

    /**
     * Create new multi-stage payment
     */
    async createPayment(paymentData, userId) {
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const Payment = mongoose.model('Payment');
            const Deal = mongoose.model('Deal');

            // Validate deal exists
            const deal = await Deal.findById(paymentData.dealId);
            if (!deal) {
                throw new Error('معامله یافت نشد');
            }

            // Create payment record
            const payment = new Payment({
                dealId: paymentData.dealId,
                tenantId: deal.tenantId,
                branchId: deal.branchId,
                totalAmount: deal.amount,
                currency: deal.currency,
                paidAmount: 0,
                remainingAmount: deal.amount,
                status: this.paymentStatuses.PENDING,
                stages: [],
                receipts: [],
                createdBy: userId,
                createdAt: new Date(),
                metadata: {
                    dealType: deal.type,
                    customerInfo: deal.customerInfo
                }
            });

            await payment.save({ session });

            // Log activity
            await activityLogService.logActivity(
                userId,
                'PAYMENT_CREATED',
                {
                    paymentId: payment._id,
                    dealId: paymentData.dealId,
                    amount: deal.amount,
                    tenantId: deal.tenantId,
                    branchId: deal.branchId
                }
            );

            await session.commitTransaction();

            logger.info('Multi-stage payment created', {
                paymentId: payment._id,
                dealId: paymentData.dealId,
                userId
            });

            return payment;

        } catch (error) {
            await session.abortTransaction();
            logger.error('Error creating multi-stage payment', { error: error.message });
            throw error;
        } finally {
            session.endSession();
        }
    }

    /**
     * Add payment receipt/stage
     */
    async addPaymentReceipt(paymentId, receiptData, userId) {
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const Payment = mongoose.model('Payment');
            
            const payment = await Payment.findById(paymentId);
            if (!payment) {
                throw new Error('پرداخت یافت نشد');
            }

            // Validate receipt data
            this.validateReceiptData(receiptData);

            // Create receipt object
            const receipt = {
                id: new mongoose.Types.ObjectId(),
                receiverName: receiptData.receiverName,
                amount: parseFloat(receiptData.amount),
                currency: receiptData.currency || payment.currency,
                receiptUrl: receiptData.receiptUrl,
                bankInfo: receiptData.bankInfo,
                transactionId: receiptData.transactionId,
                notes: receiptData.notes,
                status: this.receiptStatuses.UPLOADED,
                uploadedBy: userId,
                uploadedAt: new Date(),
                metadata: receiptData.metadata || {}
            };

            // Add receipt to payment
            payment.receipts.push(receipt);

            // Update paid amount
            const newPaidAmount = payment.paidAmount + receipt.amount;
            payment.paidAmount = newPaidAmount;
            payment.remainingAmount = payment.totalAmount - newPaidAmount;

            // Update payment status
            payment.status = this.calculatePaymentStatus(payment);

            // Add to payment stages
            payment.stages.push({
                stageNumber: payment.stages.length + 1,
                amount: receipt.amount,
                receiptId: receipt.id,
                completedAt: new Date(),
                completedBy: userId,
                status: 'completed'
            });

            // Update timestamps
            payment.updatedAt = new Date();
            if (payment.status === this.paymentStatuses.COMPLETED) {
                payment.completedAt = new Date();
            }

            await payment.save({ session });

            // Log activity
            await activityLogService.logActivity(
                userId,
                'PAYMENT_RECEIPT_ADDED',
                {
                    paymentId: payment._id,
                    receiptId: receipt.id,
                    amount: receipt.amount,
                    newStatus: payment.status,
                    paidAmount: payment.paidAmount,
                    remainingAmount: payment.remainingAmount
                }
            );

            // Send notification if payment is completed
            if (payment.status === this.paymentStatuses.COMPLETED) {
                await this.sendPaymentCompletionNotification(payment);
            }

            await session.commitTransaction();

            logger.info('Payment receipt added', {
                paymentId: payment._id,
                receiptId: receipt.id,
                amount: receipt.amount,
                newStatus: payment.status
            });

            return {
                payment,
                receipt,
                message: 'رسید پرداخت با موفقیت اضافه شد'
            };

        } catch (error) {
            await session.abortTransaction();
            logger.error('Error adding payment receipt', { error: error.message });
            throw error;
        } finally {
            session.endSession();
        }
    }

    /**
     * Verify payment receipt
     */
    async verifyReceipt(paymentId, receiptId, verificationData, userId) {
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const Payment = mongoose.model('Payment');
            
            const payment = await Payment.findById(paymentId);
            if (!payment) {
                throw new Error('پرداخت یافت نشد');
            }

            const receipt = payment.receipts.id(receiptId);
            if (!receipt) {
                throw new Error('رسید یافت نشد');
            }

            // Update receipt status
            receipt.status = verificationData.approved ? 
                this.receiptStatuses.VERIFIED : 
                this.receiptStatuses.REJECTED;

            receipt.verifiedBy = userId;
            receipt.verifiedAt = new Date();
            receipt.verificationNotes = verificationData.notes;

            // If rejected, adjust payment amounts
            if (!verificationData.approved) {
                payment.paidAmount -= receipt.amount;
                payment.remainingAmount += receipt.amount;
                payment.status = this.calculatePaymentStatus(payment);

                // Mark corresponding stage as rejected
                const stage = payment.stages.find(s => 
                    s.receiptId && s.receiptId.equals(receiptId)
                );
                if (stage) {
                    stage.status = 'rejected';
                    stage.rejectedAt = new Date();
                    stage.rejectedBy = userId;
                }
            }

            payment.updatedAt = new Date();
            await payment.save({ session });

            // Log activity
            await activityLogService.logActivity(
                userId,
                'PAYMENT_VERIFIED',
                {
                    paymentId: payment._id,
                    receiptId: receiptId,
                    approved: verificationData.approved,
                    notes: verificationData.notes
                }
            );

            await session.commitTransaction();

            logger.info('Payment receipt verified', {
                paymentId: payment._id,
                receiptId: receiptId,
                approved: verificationData.approved
            });

            return {
                payment,
                receipt,
                message: verificationData.approved ? 
                    'رسید تایید شد' : 'رسید رد شد'
            };

        } catch (error) {
            await session.abortTransaction();
            logger.error('Error verifying receipt', { error: error.message });
            throw error;
        } finally {
            session.endSession();
        }
    }

    /**
     * Get payment details with all receipts and stages
     */
    async getPaymentDetails(paymentId, userId) {
        try {
            const Payment = mongoose.model('Payment');
            
            const payment = await Payment.findById(paymentId)
                .populate('dealId')
                .populate('createdBy', 'name username')
                .populate('receipts.uploadedBy', 'name username')
                .populate('receipts.verifiedBy', 'name username')
                .lean();

            if (!payment) {
                throw new Error('پرداخت یافت نشد');
            }

            // Calculate progress
            const progress = {
                percentage: (payment.paidAmount / payment.totalAmount) * 100,
                stagesCompleted: payment.stages.filter(s => s.status === 'completed').length,
                totalStages: payment.stages.length,
                receiptsUploaded: payment.receipts.length,
                receiptsVerified: payment.receipts.filter(r => r.status === this.receiptStatuses.VERIFIED).length
            };

            return {
                ...payment,
                progress
            };

        } catch (error) {
            logger.error('Error fetching payment details', { error: error.message });
            throw error;
        }
    }

    /**
     * Get payment statistics for dashboard
     */
    async getPaymentStatistics(tenantId, timeframe = '30d') {
        try {
            const Payment = mongoose.model('Payment');
            
            const endDate = new Date();
            const startDate = new Date();
            
            switch (timeframe) {
                case '7d':
                    startDate.setDate(endDate.getDate() - 7);
                    break;
                case '30d':
                    startDate.setDate(endDate.getDate() - 30);
                    break;
                case '90d':
                    startDate.setDate(endDate.getDate() - 90);
                    break;
                default:
                    startDate.setDate(endDate.getDate() - 30);
            }

            const matchQuery = {
                createdAt: { $gte: startDate, $lte: endDate }
            };
            
            if (tenantId) {
                matchQuery.tenantId = new mongoose.Types.ObjectId(tenantId);
            }

            const stats = await Payment.aggregate([
                { $match: matchQuery },
                {
                    $group: {
                        _id: null,
                        totalPayments: { $sum: 1 },
                        totalAmount: { $sum: '$totalAmount' },
                        totalPaidAmount: { $sum: '$paidAmount' },
                        completedPayments: {
                            $sum: {
                                $cond: [
                                    { $eq: ['$status', this.paymentStatuses.COMPLETED] },
                                    1,
                                    0
                                ]
                            }
                        },
                        pendingPayments: {
                            $sum: {
                                $cond: [
                                    { $eq: ['$status', this.paymentStatuses.PENDING] },
                                    1,
                                    0
                                ]
                            }
                        },
                        partialPayments: {
                            $sum: {
                                $cond: [
                                    { $eq: ['$status', this.paymentStatuses.PARTIAL] },
                                    1,
                                    0
                                ]
                            }
                        }
                    }
                }
            ]);

            const result = stats[0] || {
                totalPayments: 0,
                totalAmount: 0,
                totalPaidAmount: 0,
                completedPayments: 0,
                pendingPayments: 0,
                partialPayments: 0
            };

            return {
                timeframe,
                period: { startDate, endDate },
                ...result,
                completionRate: result.totalPayments > 0 ? 
                    (result.completedPayments / result.totalPayments) * 100 : 0
            };

        } catch (error) {
            logger.error('Error generating payment statistics', { error: error.message });
            throw error;
        }
    }

    /**
     * Validate receipt data
     */
    validateReceiptData(receiptData) {
        if (!receiptData.receiverName) {
            throw new Error('نام دریافت کننده الزامی است');
        }
        if (!receiptData.amount || receiptData.amount <= 0) {
            throw new Error('مبلغ باید بزرگتر از صفر باشد');
        }
        if (!receiptData.receiptUrl) {
            throw new Error('آپلود رسید الزامی است');
        }
    }

    /**
     * Calculate payment status based on paid amount
     */
    calculatePaymentStatus(payment) {
        if (payment.paidAmount >= payment.totalAmount) {
            return this.paymentStatuses.COMPLETED;
        } else if (payment.paidAmount > 0) {
            return this.paymentStatuses.PARTIAL;
        } else {
            return this.paymentStatuses.PENDING;
        }
    }

    /**
     * Send payment completion notification
     */
    async sendPaymentCompletionNotification(payment) {
        try {
            // This would integrate with notification service
            logger.info('Payment completion notification sent', {
                paymentId: payment._id,
                dealId: payment.dealId
            });

            // Here you could send email, SMS, or push notifications
            
        } catch (error) {
            logger.error('Error sending payment completion notification', { 
                error: error.message 
            });
        }
    }
}

module.exports = new MultiStagePaymentService();