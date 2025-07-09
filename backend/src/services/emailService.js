// backend/src/services/emailService.js
const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransporter({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }

  async sendWelcomeEmail(user, tenant) {
    const mailOptions = {
      from: process.env.SMTP_USER,
      to: user.email,
      subject: `خوش آمدید به ${tenant.name}`,
      html: `
        <div dir="rtl" style="font-family: Arial, sans-serif;">
          <h2>خوش آمدید ${user.profile.firstName}!</h2>
          <p>حساب کاربری شما در ${tenant.name} با موفقیت ایجاد شد.</p>
          <p>اطلاعات ورود:</p>
          <ul>
            <li>ایمیل: ${user.email}</li>
            <li>نقش: ${this.getRoleDisplayName(user.role)}</li>
          </ul>
          <p>لطفاً رمز عبور خود را تغییر دهید.</p>
        </div>
      `
    };

    await this.transporter.sendMail(mailOptions);
  }

  async sendPaymentConfirmation(payment, user) {
    const mailOptions = {
      from: process.env.SMTP_USER,
      to: user.email,
      subject: 'تأیید پرداخت',
      html: `
        <div dir="rtl" style="font-family: Arial, sans-serif;">
          <h2>تأیید پرداخت</h2>
          <p>پرداخت شما با شماره ${payment.paymentNumber} تأیید شد.</p>
          <p>مبلغ: ${payment.totalAmount.toLocaleString('fa-IR')} ${payment.currency}</p>
          <p>تاریخ: ${new Date().toLocaleDateString('fa-IR')}</p>
        </div>
      `
    };

    await this.transporter.sendMail(mailOptions);
  }

  getRoleDisplayName(role) {
    const roles = {
      'super_admin': 'سوپر ادمین',
      'tenant_admin': 'مدیر صرافی',
      'manager': 'مدیر شعبه',
      'staff': 'کارمند',
      'customer': 'مشتری'
    };
    return roles[role] || role;
  }
}

module.exports = new EmailService();
