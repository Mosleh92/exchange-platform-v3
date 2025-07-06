const Invoice = require('../models/Invoice');

const InvoiceService = {
  async createInvoice({ tenantId, subscriptionId, amount, transactionInfo = null }) {
    const invoice = new Invoice({
      tenantId,
      subscriptionId,
      amount,
      status: 'unpaid',
      issueDate: new Date(),
      transactionInfo
    });
    await invoice.save();
    return invoice;
  },

  async markAsPaid(invoiceId, paidDate = new Date(), transactionInfo = null) {
    const invoice = await Invoice.findByIdAndUpdate(
      invoiceId,
      { status: 'paid', paidDate, transactionInfo },
      { new: true }
    );
    if (!invoice) throw new Error('فاکتور یافت نشد');
    return invoice;
  },

  async getInvoicesByTenant(tenantId) {
    return Invoice.find({ tenantId }).sort({ issueDate: -1 });
  },

  async getInvoiceById(invoiceId) {
    return Invoice.findById(invoiceId);
  }
};

module.exports = InvoiceService; 