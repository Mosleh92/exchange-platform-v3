const InvoiceService = require('../services/InvoiceService');

class InvoiceController {
  // صدور فاکتور جدید
  async createInvoice(req, res) {
    try {
      const { subscriptionId, amount, transactionInfo } = req.body;
      const tenantId = req.user.tenantId;
      const invoice = await InvoiceService.createInvoice({ tenantId, subscriptionId, amount, transactionInfo });
      res.status(201).json({ success: true, data: invoice });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // مشاهده فاکتورهای tenant
  async getInvoices(req, res) {
    try {
      const tenantId = req.user.tenantId;
      const invoices = await InvoiceService.getInvoicesByTenant(tenantId);
      res.json({ success: true, data: invoices });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // مشاهده یک فاکتور خاص
  async getInvoiceById(req, res) {
    try {
      const invoice = await InvoiceService.getInvoiceById(req.params.id);
      if (!invoice) return res.status(404).json({ success: false, message: 'فاکتور یافت نشد' });
      res.json({ success: true, data: invoice });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // به‌روزرسانی وضعیت پرداخت (mark as paid)
  async markAsPaid(req, res) {
    try {
      const { invoiceId, transactionInfo } = req.body;
      const invoice = await InvoiceService.markAsPaid(invoiceId, new Date(), transactionInfo);
      res.json({ success: true, data: invoice });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
}

module.exports = new InvoiceController(); 