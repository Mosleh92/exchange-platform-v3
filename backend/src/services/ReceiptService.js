const Receipt = require('../models/Receipt');
const TenantSettings = require('../models/TenantSettings');
const CustomerTransaction = require('../models/CustomerTransaction');
const User = require('../models/User');
const fs = require('fs').promises;
const path = require('path');
const PDFDocument = require('pdfkit');
const nodemailer = require('nodemailer');
const axios = require('axios');

class ReceiptService {
  // تولید رسید جدید
  static async generateReceipt(transactionId, tenantId, channels = ['email']) {
    try {
      // دریافت اطلاعات تراکنش
      const transaction = await CustomerTransaction.findById(transactionId)
        .populate('customerId', 'name email phone')
        .populate('createdBy', 'name');
      
      if (!transaction) {
        throw new Error('Transaction not found');
      }
      
      // دریافت تنظیمات صرافی
      const tenantSettings = await TenantSettings.findOne({ tenantId });
      if (!tenantSettings) {
        throw new Error('Tenant settings not found');
      }
      
      // بررسی وجود رسید قبلی
      const existingReceipt = await Receipt.findOne({
        tenantId,
        transactionId
      });
      
      if (existingReceipt) {
        return existingReceipt;
      }
      
      // تولید محتوای رسید
      const receiptContent = await this.generateReceiptContent(transaction, tenantSettings);
      
      // تولید PDF
      const pdfPath = await this.generatePDF(receiptContent, tenantSettings);
      
      // ایجاد رسید در دیتابیس
      const receipt = new Receipt({
        tenantId,
        transactionId,
        customerId: transaction.customerId._id,
        type: transaction.type,
        channels: {
          email: { enabled: channels.includes('email') },
          sms: { enabled: channels.includes('sms') },
          whatsapp: { enabled: channels.includes('whatsapp') }
        },
        content: receiptContent,
        template: {
          name: 'default',
          html: receiptContent.html,
          css: receiptContent.css
        },
        pdfFile: {
          path: pdfPath,
          fileName: `receipt_${transaction.transactionId}.pdf`,
          size: (await fs.stat(pdfPath)).size,
          generatedAt: new Date()
        },
        createdBy: transaction.createdBy._id
      });
      
      await receipt.save();
      
      // ارسال رسید
      await this.sendReceipt(receipt, tenantSettings);
      
      return receipt;
    } catch (error) {
      console.error('Error generating receipt:', error);
      throw error;
    }
  }
  
  // تولید محتوای رسید
  static async generateReceiptContent(transaction, tenantSettings) {
    const template = tenantSettings.receipt.templates.find(t => t.isDefault) || 
                    tenantSettings.receipt.templates[0];
    
    let html = template ? template.html : this.getDefaultTemplate();
    let css = template ? template.css : this.getDefaultCSS();
    
    // جایگزینی متغیرها
    const variables = {
      '{{TENANT_NAME}}': tenantSettings.contact?.address?.city || 'صرافی',
      '{{TENANT_ADDRESS}}': this.formatAddress(tenantSettings.contact.address),
      '{{TENANT_PHONE}}': tenantSettings.contact.phone.primary || '',
      '{{TENANT_EMAIL}}': tenantSettings.contact.email.primary || '',
      '{{TENANT_WEBSITE}}': tenantSettings.contact.social.website || '',
      '{{TENANT_LOGO}}': tenantSettings.branding.logo.path || '',
      '{{RECEIPT_ID}}': transaction.transactionId,
      '{{TRANSACTION_DATE}}': new Date(transaction.created_at).toLocaleDateString('fa-IR'),
      '{{TRANSACTION_TIME}}': new Date(transaction.created_at).toLocaleTimeString('fa-IR'),
      '{{CUSTOMER_NAME}}': transaction.customerId.name,
      '{{CUSTOMER_PHONE}}': transaction.customerId.phone,
      '{{CUSTOMER_EMAIL}}': transaction.customerId.email,
      '{{TRANSACTION_TYPE}}': this.getTransactionTypeText(transaction.type),
      '{{AMOUNT}}': transaction.amount.toLocaleString(),
      '{{CURRENCY}}': transaction.currency,
      '{{BALANCE_BEFORE}}': transaction.balanceBefore.toLocaleString(),
      '{{BALANCE_AFTER}}': transaction.balanceAfter.toLocaleString(),
      '{{DESCRIPTION}}': transaction.description,
      '{{EXCHANGE_RATE}}': transaction.metadata.exchangeRate || '',
      '{{FEES}}': transaction.metadata.fees || 0,
      '{{TOTAL_AMOUNT}}': (transaction.amount + (transaction.metadata.fees || 0)).toLocaleString(),
      '{{FOOTER_TEXT}}': tenantSettings.receipt.content.footer || '',
      '{{TERMS}}': tenantSettings.receipt.content.terms || '',
      '{{DISCLAIMER}}': tenantSettings.receipt.content.disclaimer || ''
    };
    
    // اعمال متغیرها
    Object.keys(variables).forEach(key => {
      html = html.replace(new RegExp(key, 'g'), variables[key]);
      css = css.replace(new RegExp(key, 'g'), variables[key]);
    });
    
    return {
      tenant: {
        name: variables['{{TENANT_NAME}}'],
        logo: variables['{{TENANT_LOGO}}'],
        address: variables['{{TENANT_ADDRESS}}'],
        phone: variables['{{TENANT_PHONE}}'],
        email: variables['{{TENANT_EMAIL}}'],
        website: variables['{{TENANT_WEBSITE}}']
      },
      transaction: {
        id: transaction.transactionId,
        type: transaction.type,
        amount: transaction.amount,
        currency: transaction.currency,
        date: transaction.created_at,
        description: transaction.description,
        reference: transaction.transactionId
      },
      customer: {
        name: transaction.customerId.name,
        phone: transaction.customerId.phone,
        email: transaction.customerId.email,
        accountNumber: transaction.accountNumber
      },
      details: {
        exchangeRate: transaction.metadata.exchangeRate,
        fees: transaction.metadata.fees || 0,
        totalAmount: transaction.amount + (transaction.metadata.fees || 0),
        notes: transaction.notes?.customer || ''
      },
      html,
      css
    };
  }
  
  // تولید PDF
  static async generatePDF(content, tenantSettings) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          margin: 50
        });
        
        const fileName = `receipt_${content.transaction.id}_${Date.now()}.pdf`;
        const filePath = path.join(__dirname, '../uploads/receipts', fileName);
        
        const stream = fs.createWriteStream(filePath);
        doc.pipe(stream);
        
        // تنظیم فونت فارسی
        doc.font('Helvetica');
        
        // هدر
        if (tenantSettings.branding.logo.path) {
          doc.image(tenantSettings.branding.logo.path, 50, 50, { width: 100 });
        }
        
        doc.fontSize(20)
           .text(content.tenant.name, 200, 70)
           .fontSize(12)
           .text(content.tenant.address, 200, 100)
           .text(`تلفن: ${content.tenant.phone}`, 200, 120)
           .text(`ایمیل: ${content.tenant.email}`, 200, 140);
        
        // خط جداکننده
        doc.moveTo(50, 180)
           .lineTo(550, 180)
           .stroke();
        
        // اطلاعات رسید
        doc.fontSize(16)
           .text('رسید تراکنش', 50, 200)
           .fontSize(12)
           .text(`شماره رسید: ${content.transaction.id}`, 50, 230)
           .text(`تاریخ: ${new Date(content.transaction.date).toLocaleDateString('fa-IR')}`, 50, 250)
           .text(`ساعت: ${new Date(content.transaction.date).toLocaleTimeString('fa-IR')}`, 50, 270);
        
        // اطلاعات مشتری
        doc.text('اطلاعات مشتری:', 50, 300)
           .text(`نام: ${content.customer.name}`, 50, 320)
           .text(`تلفن: ${content.customer.phone}`, 50, 340)
           .text(`ایمیل: ${content.customer.email}`, 50, 360);
        
        // اطلاعات تراکنش
        doc.text('جزئیات تراکنش:', 50, 390)
           .text(`نوع: ${this.getTransactionTypeText(content.transaction.type)}`, 50, 410)
           .text(`مبلغ: ${content.transaction.amount.toLocaleString()} ${content.transaction.currency}`, 50, 430)
           .text(`موجودی قبل: ${content.transaction.balanceBefore.toLocaleString()} ${content.transaction.currency}`, 50, 450)
           .text(`موجودی بعد: ${content.transaction.balanceAfter.toLocaleString()} ${content.transaction.currency}`, 50, 470);
        
        if (content.details.exchangeRate) {
          doc.text(`نرخ تبدیل: ${content.details.exchangeRate}`, 50, 490);
        }
        
        if (content.details.fees > 0) {
          doc.text(`کارمزد: ${content.details.fees.toLocaleString()} ${content.transaction.currency}`, 50, 510);
        }
        
        doc.text(`توضیحات: ${content.transaction.description}`, 50, 530);
        
        // فوتر
        doc.moveTo(50, 650)
           .lineTo(550, 650)
           .stroke()
           .fontSize(10)
           .text(content.tenant.footer || 'با تشکر از اعتماد شما', 50, 670, { align: 'center' });
        
        doc.end();
        
        stream.on('finish', () => {
          resolve(filePath);
        });
        
        stream.on('error', reject);
      } catch (error) {
        reject(error);
      }
    });
  }
  
  // ارسال رسید
  static async sendReceipt(receipt, tenantSettings) {
    const promises = [];
    
    // ارسال ایمیل
    if (receipt.channels.email.enabled && tenantSettings.receipt.delivery.email.enabled) {
      promises.push(this.sendEmail(receipt, tenantSettings));
    }
    
    // ارسال SMS
    if (receipt.channels.sms.enabled && tenantSettings.receipt.delivery.sms.enabled) {
      promises.push(this.sendSMS(receipt, tenantSettings));
    }
    
    // ارسال واتساپ
    if (receipt.channels.whatsapp.enabled && tenantSettings.receipt.delivery.whatsapp.enabled) {
      promises.push(this.sendWhatsApp(receipt, tenantSettings));
    }
    
    try {
      await Promise.all(promises);
      receipt.status = 'sent';
      await receipt.save();
    } catch (error) {
      console.error('Error sending receipt:', error);
      receipt.status = 'failed';
      await receipt.save();
    }
  }
  
  // ارسال ایمیل
  static async sendEmail(receipt, tenantSettings) {
    try {
      const transporter = nodemailer.createTransporter({
        host: tenantSettings.receipt.delivery.email.smtp.host,
        port: tenantSettings.receipt.delivery.email.smtp.port,
        secure: tenantSettings.receipt.delivery.email.smtp.secure,
        auth: {
          user: tenantSettings.receipt.delivery.email.smtp.username,
          pass: tenantSettings.receipt.delivery.email.smtp.password
        }
      });
      
      const mailOptions = {
        from: `"${tenantSettings.receipt.delivery.email.fromName}" <${tenantSettings.receipt.delivery.email.fromEmail}>`,
        to: receipt.content.customer.email,
        subject: tenantSettings.receipt.delivery.email.subject || 'رسید تراکنش',
        html: receipt.content.html,
        attachments: [{
          filename: receipt.pdfFile.fileName,
          path: receipt.pdfFile.path
        }]
      };
      
      await transporter.sendMail(mailOptions);
      
      await receipt.markChannelSent('email');
      await receipt.addDeliveryHistory('email', 'sent');
      
    } catch (error) {
      console.error('Error sending email:', error);
      await receipt.markChannelFailed('email', error.message);
      await receipt.addDeliveryHistory('email', 'failed', error.message);
      throw error;
    }
  }
  
  // ارسال SMS
  static async sendSMS(receipt, tenantSettings) {
    try {
      const smsConfig = tenantSettings.receipt.delivery.sms;
      let response;
      
      switch (smsConfig.provider) {
        case 'kavenegar':
          response = await axios.post('https://api.kavenegar.com/v1/sms/send.json', {
            receptor: receipt.content.customer.phone,
            message: this.generateSMSText(receipt),
            sender: smsConfig.fromNumber
          }, {
            headers: {
              'Authorization': `Bearer ${smsConfig.apiKey}`
            }
          });
          break;
          
        case 'melipayamak':
          response = await axios.post('https://rest.payamak-panel.com/api/SendSMS/SendSMS', {
            username: smsConfig.apiKey,
            password: smsConfig.apiSecret,
            to: receipt.content.customer.phone,
            from: smsConfig.fromNumber,
            text: this.generateSMSText(receipt)
          });
          break;
          
        default:
          throw new Error('SMS provider not supported');
      }
      
      if (response.data.success || response.data.return === 0) {
        await receipt.markChannelSent('sms');
        await receipt.addDeliveryHistory('sms', 'sent');
      } else {
        throw new Error(response.data.message || 'SMS sending failed');
      }
      
    } catch (error) {
      console.error('Error sending SMS:', error);
      await receipt.markChannelFailed('sms', error.message);
      await receipt.addDeliveryHistory('sms', 'failed', error.message);
      throw error;
    }
  }
  
  // ارسال واتساپ
  static async sendWhatsApp(receipt, tenantSettings) {
    try {
      const whatsappConfig = tenantSettings.receipt.delivery.whatsapp;
      let response;
      
      switch (whatsappConfig.provider) {
        case 'twilio':
          response = await axios.post(`https://api.twilio.com/2010-04-01/Accounts/${whatsappConfig.apiKey}/Messages.json`, {
            To: `whatsapp:${receipt.content.customer.phone}`,
            From: `whatsapp:${whatsappConfig.phoneNumber}`,
            Body: this.generateWhatsAppText(receipt),
            MediaUrl: receipt.pdfFile.path
          }, {
            auth: {
              username: whatsappConfig.apiKey,
              password: whatsappConfig.apiSecret
            }
          });
          break;
          
        default:
          throw new Error('WhatsApp provider not supported');
      }
      
      if (response.data.sid) {
        await receipt.markChannelSent('whatsapp');
        await receipt.addDeliveryHistory('whatsapp', 'sent');
      } else {
        throw new Error('WhatsApp sending failed');
      }
      
    } catch (error) {
      console.error('Error sending WhatsApp:', error);
      await receipt.markChannelFailed('whatsapp', error.message);
      await receipt.addDeliveryHistory('whatsapp', 'failed', error.message);
      throw error;
    }
  }
  
  // تولید متن SMS
  static generateSMSText(receipt) {
    return `رسید تراکنش ${receipt.content.transaction.id}
مبلغ: ${receipt.content.transaction.amount.toLocaleString()} ${receipt.content.transaction.currency}
تاریخ: ${new Date(receipt.content.transaction.date).toLocaleDateString('fa-IR')}
${receipt.content.tenant.name}`;
  }
  
  // تولید متن واتساپ
  static generateWhatsAppText(receipt) {
    return `🏦 *رسید تراکنش*

📋 شماره: ${receipt.content.transaction.id}
💰 مبلغ: ${receipt.content.transaction.amount.toLocaleString()} ${receipt.content.transaction.currency}
📅 تاریخ: ${new Date(receipt.content.transaction.date).toLocaleDateString('fa-IR')}
🕐 ساعت: ${new Date(receipt.content.transaction.date).toLocaleTimeString('fa-IR')}
👤 مشتری: ${receipt.content.customer.name}

🏢 ${receipt.content.tenant.name}`;
  }
  
  // قالب پیش‌فرض HTML
  static getDefaultTemplate() {
    return `
      <!DOCTYPE html>
      <html dir="rtl" lang="fa">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>رسید تراکنش</title>
        <style>{{CSS}}</style>
      </head>
      <body>
        <div class="receipt">
          <div class="header">
            <div class="logo">
              <img src="{{TENANT_LOGO}}" alt="لوگو">
            </div>
            <div class="info">
              <h1>{{TENANT_NAME}}</h1>
              <p>{{TENANT_ADDRESS}}</p>
              <p>تلفن: {{TENANT_PHONE}}</p>
              <p>ایمیل: {{TENANT_EMAIL}}</p>
            </div>
          </div>
          
          <div class="receipt-info">
            <h2>رسید تراکنش</h2>
            <div class="details">
              <div class="row">
                <span>شماره رسید:</span>
                <span>{{RECEIPT_ID}}</span>
              </div>
              <div class="row">
                <span>تاریخ:</span>
                <span>{{TRANSACTION_DATE}}</span>
              </div>
              <div class="row">
                <span>ساعت:</span>
                <span>{{TRANSACTION_TIME}}</span>
              </div>
            </div>
          </div>
          
          <div class="customer-info">
            <h3>اطلاعات مشتری</h3>
            <div class="details">
              <div class="row">
                <span>نام:</span>
                <span>{{CUSTOMER_NAME}}</span>
              </div>
              <div class="row">
                <span>تلفن:</span>
                <span>{{CUSTOMER_PHONE}}</span>
              </div>
              <div class="row">
                <span>ایمیل:</span>
                <span>{{CUSTOMER_EMAIL}}</span>
              </div>
            </div>
          </div>
          
          <div class="transaction-info">
            <h3>جزئیات تراکنش</h3>
            <div class="details">
              <div class="row">
                <span>نوع:</span>
                <span>{{TRANSACTION_TYPE}}</span>
              </div>
              <div class="row">
                <span>مبلغ:</span>
                <span>{{AMOUNT}} {{CURRENCY}}</span>
              </div>
              <div class="row">
                <span>موجودی قبل:</span>
                <span>{{BALANCE_BEFORE}} {{CURRENCY}}</span>
              </div>
              <div class="row">
                <span>موجودی بعد:</span>
                <span>{{BALANCE_AFTER}} {{CURRENCY}}</span>
              </div>
              {{#if EXCHANGE_RATE}}
              <div class="row">
                <span>نرخ تبدیل:</span>
                <span>{{EXCHANGE_RATE}}</span>
              </div>
              {{/if}}
              {{#if FEES}}
              <div class="row">
                <span>کارمزد:</span>
                <span>{{FEES}} {{CURRENCY}}</span>
              </div>
              {{/if}}
              <div class="row">
                <span>توضیحات:</span>
                <span>{{DESCRIPTION}}</span>
              </div>
            </div>
          </div>
          
          <div class="footer">
            <p>{{FOOTER_TEXT}}</p>
            <p>{{TERMS}}</p>
            <p>{{DISCLAIMER}}</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }
  
  // CSS پیش‌فرض
  static getDefaultCSS() {
    return `
      body {
        font-family: 'Vazir', 'Tahoma', sans-serif;
        margin: 0;
        padding: 20px;
        background-color: #f5f5f5;
      }
      
      .receipt {
        max-width: 800px;
        margin: 0 auto;
        background: white;
        padding: 30px;
        border-radius: 10px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
      }
      
      .header {
        display: flex;
        align-items: center;
        margin-bottom: 30px;
        border-bottom: 2px solid #eee;
        padding-bottom: 20px;
      }
      
      .logo img {
        width: 80px;
        height: 80px;
        object-fit: contain;
      }
      
      .info {
        margin-right: 20px;
      }
      
      .info h1 {
        margin: 0 0 10px 0;
        color: #333;
        font-size: 24px;
      }
      
      .info p {
        margin: 5px 0;
        color: #666;
        font-size: 14px;
      }
      
      h2, h3 {
        color: #333;
        border-bottom: 1px solid #eee;
        padding-bottom: 10px;
        margin-bottom: 20px;
      }
      
      .details {
        margin-bottom: 30px;
      }
      
      .row {
        display: flex;
        justify-content: space-between;
        padding: 10px 0;
        border-bottom: 1px solid #f0f0f0;
      }
      
      .row:last-child {
        border-bottom: none;
      }
      
      .row span:first-child {
        font-weight: bold;
        color: #555;
      }
      
      .row span:last-child {
        color: #333;
      }
      
      .footer {
        margin-top: 40px;
        padding-top: 20px;
        border-top: 2px solid #eee;
        text-align: center;
        color: #666;
        font-size: 12px;
      }
    `;
  }
  
  // متدهای کمکی
  static formatAddress(address) {
    if (!address) return '';
    return `${address.street || ''} ${address.city || ''} ${address.state || ''} ${address.country || ''}`.trim();
  }
  
  static getTransactionTypeText(type) {
    const types = {
      'deposit': 'واریز',
      'withdrawal': 'برداشت',
      'transfer_in': 'انتقال ورودی',
      'transfer_out': 'انتقال خروجی',
      'exchange_buy': 'خرید ارز',
      'exchange_sell': 'فروش ارز',
      'fee': 'کارمزد',
      'interest': 'سود',
      'adjustment': 'تعدیل',
      'refund': 'بازپرداخت'
    };
    return types[type] || type;
  }
}

module.exports = ReceiptService; 