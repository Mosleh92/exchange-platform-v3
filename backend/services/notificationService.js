// backend/src/services/notificationService.js
const nodemailer = require('nodemailer');
const twilio = require('twilio');
const webpush = require('web-push');

class NotificationService {
  constructor() {
    this.emailTransporter = nodemailer.createTransporter({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });

    this.smsClient = twilio(
      process.env.TWILIO_SID,
      process.env.TWILIO_TOKEN
    );

    // Setup Web Push
    webpush.setVapidDetails(
      'mailto:' + process.env.CONTACT_EMAIL,
      process.env.VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY
    );
  }

  async sendMultiChannelNotification(userId, notification) {
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');

    const results = {
      email: false,
      sms: false,
      push: false,
      inApp: false
    };

    // Send Email
    if (user.preferences?.email && notification.channels?.includes('email')) {
      results.email = await this.sendEmailNotification(user, notification);
    }

    // Send SMS
    if (user.preferences?.sms && notification.channels?.includes('sms')) {
      results.sms = await this.sendSMSNotification(user, notification);
    }

    // Send Push Notification
    if (notification.channels?.includes('push')) {
      results.push = await this.sendPushNotification(user, notification);
    }

    // Store In-App Notification
    results.inApp = await this.storeInAppNotification(userId, notification);

    // Real-time WebSocket notification
    if (global.io) {
      global.io.to(`user_${userId}`).emit('notification', {
        type: notification.type,
        title: notification.title,
        message: notification.message,
        data: notification.data,
        timestamp: new Date()
      });
    }

    return results;
  }

  async sendEmailNotification(user, notification) {
    try {
      const mailOptions = {
        from: process.env.SMTP_FROM,
        to: user.email,
        subject: notification.title,
        html: this.generateEmailTemplate(notification, user)
      };

      await this.emailTransporter.sendMail(mailOptions);
      return true;
    } catch (error) {
      console.error('Email notification error:', error);
      return false;
    }
  }

  async sendSMSNotification(user, notification) {
    try {
      await this.smsClient.messages.create({
        body: `${notification.title}\n${notification.message}`,
        from: process.env.TWILIO_PHONE,
        to: user.profile.phone
      });
      return true;
    } catch (error) {
      console.error('SMS notification error:', error);
      return false;
    }
  }

  async sendPushNotification(user, notification) {
    try {
      const subscriptions = await this.getUserPushSubscriptions(user._id);
      
      const payload = JSON.stringify({
        title: notification.title,
        body: notification.message,
        icon: '/icon-192x192.png',
        badge: '/badge-72x72.png',
        data: notification.data
      });

      const promises = subscriptions.map(subscription => 
        webpush.sendNotification(subscription, payload)
      );

      await Promise.all(promises);
      return true;
    } catch (error) {
      console.error('Push notification error:', error);
      return false;
    }
  }

  generateEmailTemplate(notification, user) {
    return `
      <!DOCTYPE html>
      <html dir="rtl">
      <head>
        <meta charset="UTF-8">
        <title>${notification.title}</title>
        <style>
          body { font-family: Arial, sans-serif; direction: rtl; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #4F46E5; color: white; padding: 20px; text-align: center; }
          .content { padding: 30px; background: #f9f9f9; }
          .footer { padding: 20px; text-align: center; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>پلتفرم صرافی همیار</h1>
          </div>
          <div class="content">
            <h2>${notification.title}</h2>
            <p>سلام ${user.profile.firstName},</p>
            <p>${notification.message}</p>
            ${notification.data?.actionUrl ? `
              <p style="text-align: center;">
                <a href="${notification.data.actionUrl}" 
                   style="background: #4F46E5; color: white; padding: 10px 20px; 
                          text-decoration: none; border-radius: 5px;">
                  مشاهده جزئیات
                </a>
              </p>
            ` : ''}
          </div>
          <div class="footer">
            <p>با احترام، تیم پلتفرم صرافی همیار</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }
}

module.exports = new NotificationService();
