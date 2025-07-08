const P2PAnnouncement = require('../models/P2PAnnouncement');
const P2PTransaction = require('../models/P2PTransaction');
const { validationResult } = require('express-validator');

class P2PController {
    // Get P2P announcements with privacy protection
    async getAnnouncements(req, res) {
        try {
            const { page = 1, limit = 20, currency, type } = req.query;
            
            const query = { 
                status: 'active',
                expiresAt: { $gt: new Date() }
            };
            
            if (currency) query.currency = currency;
            if (type) query.type = type;
            
            const announcements = await P2PAnnouncement.find(query)
                .populate('createdBy', 'name') // Only name, no sensitive data
                .select('-tenantId -createdBy.email -createdBy.balances') // Hide sensitive fields
                .sort({ createdAt: -1 })
                .limit(limit * 1)
                .skip((page - 1) * limit);
            
            const total = await P2PAnnouncement.countDocuments(query);
            
            res.json({
                announcements,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    pages: Math.ceil(total / limit)
                }
            });
            
        } catch (error) {
            res.status(500).json({ 
                error: 'Failed to fetch announcements',
                details: error.message
            });
        }
    }
    
    // Create P2P announcement
    async createAnnouncement(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ 
                    error: 'Validation failed',
                    details: errors.array()
                });
            }
            
            const { 
                type, 
                currency, 
                amount, 
                rate, 
                minAmount, 
                maxAmount, 
                description,
                expiresIn = 24 // hours
            } = req.body;
            
            // Validate amounts
            if (minAmount && minAmount > amount) {
                return res.status(400).json({
                    error: 'Minimum amount cannot be greater than total amount'
                });
            }
            
            if (maxAmount && maxAmount > amount) {
                return res.status(400).json({
                    error: 'Maximum amount cannot be greater than total amount'
                });
            }
            
            // Set expiration date
            const expiresAt = new Date();
            expiresAt.setHours(expiresAt.getHours() + expiresIn);
            
            const announcement = new P2PAnnouncement({
                type,
                currency,
                amount,
                rate,
                minAmount,
                maxAmount,
                description,
                expiresAt,
                createdBy: req.user.userId,
                tenantId: req.user.tenantId,
                status: 'active'
            });
            
            await announcement.save();
            
            // Log P2P announcement creation
            await AuditLog.create({
                eventType: 'P2P_ANNOUNCEMENT_CREATED',
                details: {
                    announcementId: announcement._id,
                    type,
                    currency,
                    amount,
                    rate,
                    createdBy: req.user.userId,
                    tenantId: req.user.tenantId
                },
                timestamp: new Date()
            });
            
            res.status(201).json(announcement);
            
        } catch (error) {
            res.status(500).json({ 
                error: 'Failed to create announcement',
                details: error.message
            });
        }
    }
    
    // Record P2P transaction (with verification)
    async recordTransaction(req, res) {
        try {
            const { announcementId, amount, notes } = req.body;
            
            // Find and validate announcement
            const announcement = await P2PAnnouncement.findById(announcementId);
            if (!announcement) {
                return res.status(404).json({ error: 'Announcement not found' });
            }
            
            if (announcement.status !== 'active') {
                return res.status(400).json({ error: 'Announcement is not active' });
            }
            
            if (announcement.expiresAt < new Date()) {
                return res.status(400).json({ error: 'Announcement has expired' });
            }
            
            // Prevent self-trading
            if (announcement.createdBy.toString() === req.user.userId) {
                return res.status(400).json({ error: 'Cannot trade with your own announcement' });
            }
            
            // Validate amount constraints
            if (announcement.minAmount && amount < announcement.minAmount) {
                return res.status(400).json({
                    error: `Amount must be at least ${announcement.minAmount}`
                });
            }
            
            if (announcement.maxAmount && amount > announcement.maxAmount) {
                return res.status(400).json({
                    error: `Amount must not exceed ${announcement.maxAmount}`
                });
            }
            
            // Check available amount
            const totalTraded = await P2PTransaction.aggregate([
                {
                    $match: {
                        announcementId: announcement._id,
                        status: { $in: ['pending', 'completed'] }
                    }
                },
                {
                    $group: {
                        _id: null,
                        total: { $sum: '$amount' }
                    }
                }
            ]);
            
            const availableAmount = announcement.amount - (totalTraded[0]?.total || 0);
            if (amount > availableAmount) {
                return res.status(400).json({
                    error: `Only ${availableAmount} available for trading`
                });
            }
            
            // Create transaction record
            const transaction = new P2PTransaction({
                announcementId,
                sellerId: announcement.createdBy,
                buyerId: req.user.userId,
                sellerTenantId: announcement.tenantId,
                buyerTenantId: req.user.tenantId,
                currency: announcement.currency,
                amount,
                rate: announcement.rate,
                totalValue: amount * announcement.rate,
                notes,
                status: 'pending',
                createdAt: new Date()
            });
            
            await transaction.save();
            
            // Log P2P transaction
            await AuditLog.create({
                eventType: 'P2P_TRANSACTION_RECORDED',
                details: {
                    transactionId: transaction._id,
                    announcementId,
                    sellerId: announcement.createdBy,
                    buyerId: req.user.userId,
                    currency: announcement.currency,
                    amount,
                    rate: announcement.rate,
                    totalValue: transaction.totalValue
                },
                timestamp: new Date()
            });
            
            res.status(201).json({
                success: true,
                transaction,
                message: 'Transaction recorded successfully. Status: Pending verification.'
            });
            
        } catch (error) {
            res.status(500).json({ 
                error: 'Failed to record transaction',
                details: error.message
            });
        }
    }
    
    // Get user's P2P transactions
    async getMyTransactions(req, res) {
        try {
            const { page = 1, limit = 20, status } = req.query;
            
            const query = {
                $or: [
                    { sellerId: req.user.userId },
                    { buyerId: req.user.userId }
                ]
            };
            
            if (status) query.status = status;
            
            const transactions = await P2PTransaction.find(query)
                .populate('announcementId', 'type currency')
                .populate('sellerId', 'name')
                .populate('buyerId', 'name')
                .sort({ createdAt: -1 })
                .limit(limit * 1)
                .skip((page - 1) * limit);
            
            const total = await P2PTransaction.countDocuments(query);
            
            res.json({
                transactions,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    pages: Math.ceil(total / limit)
                }
            });
            
        } catch (error) {
            res.status(500).json({ 
                error: 'Failed to fetch transactions',
                details: error.message
            });
        }
    }
}

module.exports = new P2PController();
