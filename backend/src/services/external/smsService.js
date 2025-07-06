const axios = require('axios');

async function sendSMS({ to, text, provider, config }) {
  switch (provider) {
    case 'kavenegar':
      return axios.post('https://api.kavenegar.com/v1/sms/send.json', {
        receptor: to,
        message: text,
        sender: config.fromNumber
      }, {
        headers: { 'Authorization': `Bearer ${config.apiKey}` }
      });
    case 'melipayamak':
      return axios.post('https://rest.payamak-panel.com/api/SendSMS/SendSMS', {
        username: config.apiKey,
        password: config.apiSecret,
        to,
        from: config.fromNumber,
        text
      });
    case 'twilio':
      return axios.post(`https://api.twilio.com/2010-04-01/Accounts/${config.apiKey}/Messages.json`, {
        to,
        from: config.fromNumber,
        body: text
      }, {
        auth: {
          username: config.apiKey,
          password: config.apiSecret
        }
      });
    default:
      throw new Error('SMS provider not supported');
  }
}

module.exports = { sendSMS }; 