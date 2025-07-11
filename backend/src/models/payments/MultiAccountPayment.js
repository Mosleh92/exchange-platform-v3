// backend/src/models/payments/MultiAccountPayment.js
const mongoose = require('mongoose');

const multiAccountPaymentSchema = new mongoose.Schema({
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true
  },
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  transactionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Transaction'
  },
  paymentNumber: {
    type: String,
    required: true,
    unique: true
  },
  totalAmount: {
    type: Number,
    required: true
  },
  paidAmount: {
    type: Number,
    default: 0
  },
  remainingAmount: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    default: 'IRR'
  },
  exchangeRate: {
    type: Number,
    default: 1
  },
  status: {
    type: String,
    enum: ['pending', 'partial', 'completed', 'cancelled'],
    default: 'pending'
  },
  description: {
    type: String,
    required: true
  },
  dueDate: Date,
  paymentAccounts: [{
    accountName: {
      type: String,
      required: true
    },
    accountNumber: {
      type: String,
      required: true
    },
    bankName: String,
    iban: String,
    swiftCode: String,
    isActive: {
      type: Boolean,
      default: true
    }
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Auto-increment payment number
multiAccountPaymentSchema.pre('save', async function(next) {
  if (this.isNew) {
    const count = await this.constructor.countDocuments({ tenantId: this.tenantId });
    this.paymentNumber = `PAY-${this.tenantId.toString().slice(-6)}-${(count + 1).toString().padStart(6, '0')}`;
  }
  next();
});

multiAccountPaymentSchema.index({ tenantId: 1, paymentNumber: 1 });
multiAccountPaymentSchema.index({ tenantId: 1, customerId: 1 });
multiAccountPaymentSchema.index({ tenantId: 1, status: 1 });

module.exports = mongoose.model('MultiAccountPayment', multiAccountPaymentSchema);

// backend/src/models/payments/PaymentReceipt.js
const mongoose = require('mongoose');

const paymentReceiptSchema = new mongoose.Schema({
  paymentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MultiAccountPayment',
    required: true
  },
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true
  },
  receiptNumber: {
    type: String,
    required: true,
    unique: true
  },
  targetAccount: {
    accountName: {
      type: String,
      required: true
    },
    accountNumber: {
      type: String,
      required: true
    },
    bankName: String
  },
  senderInfo: {
    name: {
      type: String,
      required: true
    },
    accountNumber: String,
    bankName: String,
    phone: String
  },
  amount: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    default: 'IRR'
  },
  paymentDate: {
    type: Date,
    required: true
  },
  receiptImage: {
    filename: String,
    originalName: String,
    mimetype: String,
    size: Number,
    url: String
  },
  trackingNumber: String,
  status: {
    type: String,
    enum: ['pending', 'verified', 'rejected'],
    default: 'pending'
  },
  notes: String,
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  verifiedAt: Date,
  rejectionReason: String,
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Auto-increment receipt number
paymentReceiptSchema.pre('save', async function(next) {
  if (this.isNew) {
    const count = await this.constructor.countDocuments({ tenantId: this.tenantId });
    this.receiptNumber = `REC-${this.tenantId.toString().slice(-6)}-${(count + 1).toString().padStart(6, '0')}`;
  }
  next();
});

paymentReceiptSchema.index({ paymentId: 1 });
paymentReceiptSchema.index({ tenantId: 1, receiptNumber: 1 });
paymentReceiptSchema.index({ tenantId: 1, status: 1 });

module.exports = mongoose.model('PaymentReceipt', paymentReceiptSchema);

// backend/src/controllers/payments/MultiPaymentController.js
const MultiAccountPayment = require('../../models/payments/MultiAccountPayment');
const PaymentReceipt = require('../../models/payments/PaymentReceipt');
const Transaction = require('../../models/accounting/Transaction');
const User = require('../../models/User');
const multer = require('multer');
const path = require('path');

// Multer configuration for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/receipts/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'receipt-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('فقط فایل‌های تصویری و PDF مجاز هستند'));
    }
  }
});

class MultiPaymentController {
  // ایجاد درخواست پرداخت چندحسابه
  static async createMultiAccountPayment(req, res) {
    try {
      const { 
        customerId, 
        totalAmount, 
        currency, 
        description, 
        dueDate, 
        paymentAccounts,
        transactionId 
      } = req.body;
      
      const tenantId = req.tenant ? req.tenant._id : req.body.tenantId;

      // بررسی وجود مشتری
      const customer = await User.findById(customerId);
      if (!customer) {
        return res.status(404).json({
          success: false,
          message: 'مشتری یافت نشد'
        });
      }

      const payment = new MultiAccountPayment({
        tenantId,
        customerId,
        totalAmount,
        remainingAmount: totalAmount,
        currency: currency || 'IRR',
        description,
        dueDate: dueDate ? new Date(dueDate) : null,
        paymentAccounts: paymentAccounts || [],
        transactionId,
        createdBy: req.user.id
      });

      await payment.save();

      res.status(201).json({
        success: true,
        data: payment,
        message: 'درخواست پرداخت چندحسابه ایجاد شد'
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'خطا در ایجاد درخواست پرداخت',
        error: error.message
      });
    }
  }

  // آپلود رسید پرداخت
  static uploadReceipt = upload.single('receiptImage');
  
  static async submitPaymentReceipt(req, res) {
    try {
      const { paymentId } = req.params;
      const {
        targetAccountName,
        targetAccountNumber,
        targetBankName,
        senderName,
        senderAccountNumber,
        senderBankName,
        senderPhone,
        amount,
        paymentDate,
        trackingNumber,
        notes
      } = req.body;

      // بررسی وجود درخواست پرداخت
      const payment = await MultiAccountPayment.findById(paymentId);
      if (!payment) {
        return res.status(404).json({
          success: false,
          message: 'درخواست پرداخت یافت نشد'
        });
      }

      // بررسی وضعیت پرداخت
      if (payment.status === 'completed') {
        return res.status(400).json({
          success: false,
          message: 'پرداخت قبلاً تکمیل شده است'
        });
      }

      // بررسی مبلغ
      if (parseFloat(amount) <= 0) {
        return res.status(400).json({
          success: false,
          message: 'مبلغ پرداخت باید بزرگتر از صفر باشد'
        });
      }

      if (parseFloat(amount) > payment.remainingAmount) {
        return res.status(400).json({
          success: false,
          message: 'مبلغ پرداخت بیشتر از مبلغ باقی‌مانده است'
        });
      }

      // ایجاد رسید پرداخت
      const receipt = new PaymentReceipt({
        paymentId: payment._id,
        tenantId: payment.tenantId,
        targetAccount: {
          accountName: targetAccountName,
          accountNumber: targetAccountNumber,
          bankName: targetBankName
        },
        senderInfo: {
          name: senderName,
          accountNumber: senderAccountNumber,
          bankName: senderBankName,
          phone: senderPhone
        },
        amount: parseFloat(amount),
        currency: payment.currency,
        paymentDate: new Date(paymentDate),
        trackingNumber,
        notes,
        uploadedBy: req.user.id
      });

      // اضافه کردن اطلاعات فایل آپلود شده
      if (req.file) {
        receipt.receiptImage = {
          filename: req.file.filename,
          originalName: req.file.originalname,
          mimetype: req.file.mimetype,
          size: req.file.size,
          url: `/uploads/receipts/${req.file.filename}`
        };
      }

      await receipt.save();

      // بروزرسانی وضعیت پرداخت
      payment.paidAmount += parseFloat(amount);
      payment.remainingAmount -= parseFloat(amount);
      
      if (payment.remainingAmount <= 0.01) {
        payment.status = 'completed';
        payment.remainingAmount = 0;
      } else {
        payment.status = 'partial';
      }

      await payment.save();

      res.status(201).json({
        success: true,
        data: {
          receipt,
          payment: {
            id: payment._id,
            totalAmount: payment.totalAmount,
            paidAmount: payment.paidAmount,
            remainingAmount: payment.remainingAmount,
            status: payment.status
          }
        },
        message: 'رسید پرداخت با موفقیت ثبت شد'
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'خطا در ثبت رسید پرداخت',
        error: error.message
      });
    }
  }

  // تأیید یا رد رسید پرداخت
  static async verifyPaymentReceipt(req, res) {
    try {
      const { receiptId } = req.params;
      const { status, rejectionReason } = req.body;

      const receipt = await PaymentReceipt.findById(receiptId);
      if (!receipt) {
        return res.status(404).json({
          success: false,
          message: 'رسید پرداخت یافت نشد'
        });
      }

      // بررسی دسترسی
      if (req.user.role !== 'tenant_admin' && req.user.role !== 'manager') {
        return res.status(403).json({
          success: false,
          message: 'عدم دسترسی به تأیید رسید'
        });
      }

      receipt.status = status;
      receipt.verifiedBy = req.user.id;
      receipt.verifiedAt = new Date();
      
      if (status === 'rejected') {
        receipt.rejectionReason = rejectionReason;
        
        // برگرداندن مبلغ به باقی‌مانده در صورت رد
        const payment = await MultiAccountPayment.findById(receipt.paymentId);
        payment.paidAmount -= receipt.amount;
        payment.remainingAmount += receipt.amount;
        
        if (payment.remainingAmount > 0) {
          payment.status = payment.paidAmount > 0 ? 'partial' : 'pending';
        }
        
        await payment.save();
      }

      await receipt.save();

      res.json({
        success: true,
        data: receipt,
        message: status === 'verified' ? 'رسید تأیید شد' : 'رسید رد شد'
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'خطا در تأیید رسید',
        error: error.message
      });
    }
  }

  // دریافت لیست پرداخت‌ها
  static async getPayments(req, res) {
    try {
      const tenantId = req.tenant ? req.tenant._id : req.query.tenantId;
      const { status, customerId, page = 1, limit = 10 } = req.query;

      const query = { tenantId };
      if (status) query.status = status;
      if (customerId) query.customerId = customerId;

      const payments = await MultiAccountPayment.find(query)
        .populate('customerId', 'email profile')
        .populate('createdBy', 'email profile')
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);

      const total = await MultiAccountPayment.countDocuments(query);

      res.json({
        success: true,
        data: {
          payments,
          pagination: {
            currentPage: page,
            totalPages: Math.ceil(total / limit),
            totalItems: total
          }
        }
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'خطا در دریافت پرداخت‌ها',
        error: error.message
      });
    }
  }

  // دریافت جزئیات پرداخت با رسیدها
  static async getPaymentDetails(req, res) {
    try {
      const { paymentId } = req.params;

      const payment = await MultiAccountPayment.findById(paymentId)
        .populate('customerId', 'email profile')
        .populate('createdBy', 'email profile');

      if (!payment) {
        return res.status(404).json({
          success: false,
          message: 'پرداخت یافت نشد'
        });
      }

      // دریافت رسیدهای مربوط به این پرداخت
      const receipts = await PaymentReceipt.find({ paymentId })
        .populate('uploadedBy', 'email profile')
        .populate('verifiedBy', 'email profile')
        .sort({ createdAt: -1 });

      res.json({
        success: true,
        data: {
          payment,
          receipts
        }
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'خطا در دریافت جزئیات پرداخت',
        error: error.message
      });
    }
  }

  // دریافت لیست رسیدهای منتظر تأیید
  static async getPendingReceipts(req, res) {
    try {
      const tenantId = req.tenant ? req.tenant._id : req.query.tenantId;
      const { page = 1, limit = 10 } = req.query;

      const receipts = await PaymentReceipt.find({ 
        tenantId, 
        status: 'pending' 
      })
        .populate('paymentId', 'paymentNumber description customerId')
        .populate('uploadedBy', 'email profile')
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);

      const total = await PaymentReceipt.countDocuments({ 
        tenantId, 
        status: 'pending' 
      });

      res.json({
        success: true,
        data: {
          receipts,
          pagination: {
            currentPage: page,
            totalPages: Math.ceil(total / limit),
            totalItems: total
          }
        }
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'خطا در دریافت رسیدهای منتظر',
        error: error.message
      });
    }
  }

  // بروزرسانی حساب‌های پرداخت
  static async updatePaymentAccounts(req, res) {
    try {
      const { paymentId } = req.params;
      const { paymentAccounts } = req.body;

      const payment = await MultiAccountPayment.findByIdAndUpdate(
        paymentId,
        { paymentAccounts },
        { new: true }
      );

      if (!payment) {
        return res.status(404).json({
          success: false,
          message: 'پرداخت یافت نشد'
        });
      }

      res.json({
        success: true,
        data: payment,
        message: 'حساب‌های پرداخت بروزرسانی شد'
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'خطا در بروزرسانی حساب‌ها',
        error: error.message
      });
    }
  }

  // گزارش پرداخت‌ها
  static async getPaymentReport(req, res) {
    try {
      const tenantId = req.tenant ? req.tenant._id : req.query.tenantId;
      const { startDate, endDate, status } = req.query;

      const matchQuery = { tenantId };
      if (startDate || endDate) {
        matchQuery.createdAt = {};
        if (startDate) matchQuery.createdAt.$gte = new Date(startDate);
        if (endDate) matchQuery.createdAt.$lte = new Date(endDate);
      }
      if (status) matchQuery.status = status;

      const report = await MultiAccountPayment.aggregate([
        { $match: matchQuery },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            totalAmount: { $sum: '$totalAmount' },
            paidAmount: { $sum: '$paidAmount' },
            remainingAmount: { $sum: '$remainingAmount' }
          }
        },
        { $sort: { _id: 1 } }
      ]);

      // محاسبه آمار کلی
      const totalStats = await MultiAccountPayment.aggregate([
        { $match: matchQuery },
        {
          $group: {
            _id: null,
            totalPayments: { $sum: 1 },
            totalAmount: { $sum: '$totalAmount' },
            totalPaid: { $sum: '$paidAmount' },
            totalRemaining: { $sum: '$remainingAmount' }
          }
        }
      ]);

      res.json({
        success: true,
        data: {
          statusReport: report,
          totalStats: totalStats[0] || {
            totalPayments: 0,
            totalAmount: 0,
            totalPaid: 0,
            totalRemaining: 0
          }
        }
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'خطا در تهیه گزارش پرداخت‌ها',
        error: error.message
      });
    }
  }

  // حذف پرداخت (فقط در صورت عدم وجود رسید)
  static async deletePayment(req, res) {
    try {
      const { paymentId } = req.params;

      // بررسی وجود رسید
      const receiptsCount = await PaymentReceipt.countDocuments({ paymentId });
      if (receiptsCount > 0) {
        return res.status(400).json({
          success: false,
          message: 'نمی‌توان پرداخت دارای رسید را حذف کرد'
        });
      }

      const payment = await MultiAccountPayment.findByIdAndDelete(paymentId);
      if (!payment) {
        return res.status(404).json({
          success: false,
          message: 'پرداخت یافت نشد'
        });
      }

      res.json({
        success: true,
        message: 'پرداخت حذف شد'
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'خطا در حذف پرداخت',
        error: error.message
      });
    }
  }
}

module.exports = MultiPaymentController;

// backend/src/routes/payments.js
const express = require('express');
const router = express.Router();
const MultiPaymentController = require('../controllers/payments/MultiPaymentController');
const authMiddleware = require('../middleware/authMiddleware');
const tenantMiddleware = require('../middleware/tenantMiddleware');

router.use(authMiddleware);
router.use(tenantMiddleware);

// مدیریت پرداخت‌های چندحسابه
router.post('/', MultiPaymentController.createMultiAccountPayment);
router.get('/', MultiPaymentController.getPayments);
router.get('/pending-receipts', MultiPaymentController.getPendingReceipts);
router.get('/report', MultiPaymentController.getPaymentReport);
router.get('/:paymentId', MultiPaymentController.getPaymentDetails);
router.put('/:paymentId/accounts', MultiPaymentController.updatePaymentAccounts);
router.delete('/:paymentId', MultiPaymentController.deletePayment);

// مدیریت رسیدهای پرداخت
router.post('/:paymentId/receipts', 
  MultiPaymentController.uploadReceipt, 
  MultiPaymentController.submitPaymentReceipt
);
router.patch('/receipts/:receiptId/verify', MultiPaymentController.verifyPaymentReceipt);

module.exports = router;

// Frontend Component - MultiAccountPayment.jsx
import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Upload, Plus, Trash2, Check, X } from 'lucide-react';

const MultiAccountPayment = ({ paymentId }) => {
  const [payment, setPayment] = useState(null);
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploadForm, setUploadForm] = useState({
    targetAccountName: '',
    targetAccountNumber: '',
    targetBankName: '',
    senderName: '',
    senderAccountNumber: '',
    senderBankName: '',
    senderPhone: '',
    amount: '',
    paymentDate: '',
    trackingNumber: '',
    notes: '',
    receiptImage: null
  });

  useEffect(() => {
    fetchPaymentDetails();
  }, [paymentId]);

  const fetchPaymentDetails = async () => {
    try {
      const response = await fetch(`/api/payments/${paymentId}`);
      const data = await response.json();
      
      if (data.success) {
        setPayment(data.data.payment);
        setReceipts(data.data.receipts);
      }
    } catch (error) {
      console.error('Error fetching payment details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setUploadForm({ ...uploadForm, receiptImage: file });
    }
  };

  const handleSubmitReceipt = async (e) => {
    e.preventDefault();
    
    const formData = new FormData();
    Object.keys(uploadForm).forEach(key => {
      if (uploadForm[key]) {
        formData.append(key, uploadForm[key]);
      }
    });

    try {
      const response = await fetch(`/api/payments/${paymentId}/receipts`, {
        method: 'POST',
        body: formData
      });

      const data = await response.json();
      
      if (data.success) {
        // Reset form
        setUploadForm({
          targetAccountName: '',
          targetAccountNumber: '',
          targetBankName: '',
          senderName: '',
          senderAccountNumber: '',
          senderBankName: '',
          senderPhone: '',
          amount: '',
          paymentDate: '',
          trackingNumber: '',
          notes: '',
          receiptImage: null
        });
        
        // Refresh payment details
        fetchPaymentDetails();
        
        alert('رسید پرداخت با موفقیت ثبت شد');
      } else {
        alert(data.message || 'خطا در ثبت رسید');
      }
    } catch (error) {
      console.error('Error submitting receipt:', error);
      alert('خطا در ثبت رسید');
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { color: 'bg-yellow-100 text-yellow-800', text: 'در انتظار' },
      partial: { color: 'bg-blue-100 text-blue-800', text: 'جزئی' },
      completed: { color: 'bg-green-100 text-green-800', text: 'تکمیل شده' },
      cancelled: { color: 'bg-red-100 text-red-800', text: 'لغو شده' }
    };

    const config = statusConfig[status] || statusConfig.pending;
    return (
      <Badge className={config.color}>
        {config.text}
      </Badge>
    );
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('fa-IR').format(amount);
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64">در حال بارگذاری...</div>;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Payment Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex justify-between items-center">
            <span>جزئیات پرداخت - {payment?.paymentNumber}</span>
            {getStatusBadge(payment?.status)}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>مبلغ کل</Label>
              <p className="text-lg font-semibold">{formatCurrency(payment?.totalAmount)} {payment?.currency}</p>
            </div>
            <div>
              <Label>مبلغ پرداخت شده</Label>
              <p className="text-lg font-semibold text-green-600">{formatCurrency(payment?.paidAmount)} {payment?.currency}</p>
            </div>
            <div>
              <Label>مبلغ باقی‌مانده</Label>
              <p className="text-lg font-semibold text-red-600">{formatCurrency(payment?.remainingAmount)} {payment?.currency}</p>
            </div>
          </div>
          <div className="mt-4">
            <Label>توضیحات</Label>
            <p className="text-gray-600">{payment?.description}</p>
          </div>
        </CardContent>
      </Card>

      {/* Payment Accounts */}
      <Card>
        <CardHeader>
          <CardTitle>حساب‌های پرداخت</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {payment?.paymentAccounts?.map((account, index) => (
              <div key={index} className="p-3 border rounded-lg">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium">{account.accountName}</p>
                    <p className="text-sm text-gray-600">{account.accountNumber}</p>
                    {account.bankName && <p className="text-sm text-gray-600">{account.bankName}</p>}
                  </div>
                  <Badge variant={account.isActive ? 'default' : 'secondary'}>
                    {account.isActive ? 'فعال' : 'غیرفعال'}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Receipt Upload Form */}
      {payment?.status !== 'completed' && (
        <Card>
          <CardHeader>
            <CardTitle>ثبت رسید پرداخت</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmitReceipt} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="targetAccountName">نام حساب مقصد</Label>
                  <Input
                    id="targetAccountName"
                    value={uploadForm.targetAccountName}
                    onChange={(e) => setUploadForm({...uploadForm, targetAccountName: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="targetAccountNumber">شماره حساب مقصد</Label>
                  <Input
                    id="targetAccountNumber"
                    value={uploadForm.targetAccountNumber}
                    onChange={(e) => setUploadForm({...uploadForm, targetAccountNumber: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="senderName">نام فرستنده</Label>
                  <Input
                    id="senderName"
                    value={uploadForm.senderName}
                    onChange={(e) => setUploadForm({...uploadForm, senderName: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="amount">مبلغ پرداخت</Label>
                  <Input
                    id="amount"
                    type="number"
                    value={uploadForm.amount}
                    onChange={(e) => setUploadForm({...uploadForm, amount: e.target.value})}
                    max={payment?.remainingAmount}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="paymentDate">تاریخ پرداخت</Label>
                  <Input
                    id="paymentDate"
                    type="date"
                    value={uploadForm.paymentDate}
                    onChange={(e) => setUploadForm({...uploadForm, paymentDate: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="trackingNumber">شماره پیگیری</Label>
                  <Input
                    id="trackingNumber"
                    value={uploadForm.trackingNumber}
                    onChange={(e) => setUploadForm({...uploadForm, trackingNumber: e.target.value})}
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="receiptImage">تصویر رسید</Label>
                <Input
                  id="receiptImage"
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={handleFileChange}
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="notes">یادداشت</Label>
                <Input
                  id="notes"
                  value={uploadForm.notes}
                  onChange={(e) => setUploadForm({...uploadForm, notes: e.target.value})}
                />
              </div>
              
              <Button type="submit" className="w-full">
                <Upload className="w-4 h-4 mr-2" />
                ثبت رسید پرداخت
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Receipts List */}
      <Card>
        <CardHeader>
          <CardTitle>رسیدهای پرداخت</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {receipts.map((receipt) => (
              <div key={receipt._id} className="p-4 border rounded-lg">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-medium">{receipt.receiptNumber}</p>
                    <p className="text-sm text-gray-600">
                      {receipt.senderInfo.name} - {formatCurrency(receipt.amount)} {receipt.currency}
                    </p>
                  </div>
                  {getStatusBadge(receipt.status)}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="font-medium">حساب مقصد:</span> {receipt.targetAccount.accountName}
                  </div>
                  <div>
                    <span className="font-medium">تاریخ پرداخت:</span> {new Date(receipt.paymentDate).toLocaleDateString('fa-IR')}
                  </div>
                  {receipt.trackingNumber && (
                    <div>
                      <span className="font-medium">شماره پیگیری:</span> {receipt.trackingNumber}
                    </div>
                  )}
                </div>
                
                {receipt.receiptImage && (
                  <div className="mt-2">
                    <a 
                      href={receipt.receiptImage.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      مشاهده رسید
                    </a>
                  </div>
                )}
                
                {receipt.status === 'rejected' && receipt.rejectionReason && (
                  <div className="mt-2 p-2 bg-red-50 rounded">
                    <p className="text-sm text-red-600">
                      <span className="font-medium">دلیل رد:</span> {receipt.rejectionReason}
                    </p>
                  </div>
                )}
              </div>
            ))}
            
            {receipts.length === 0 && (
              <p className="text-center text-gray-500 py-8">
                هیچ رسیدی ثبت نشده است
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MultiAccountPayment;
