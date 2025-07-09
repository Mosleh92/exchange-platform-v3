// backend/src/services/remittancePartnerService.js
const axios = require('axios');
const logger = require('../utils/logger');

class RemittancePartnerService {
  constructor() {
    this.partners = {
      western_union: {
        apiUrl: process.env.WU_API_URL,
        apiKey: process.env.WU_API_KEY,
        enabled: process.env.WU_ENABLED === 'true'
      },
      moneygram: {
        apiUrl: process.env.MG_API_URL,
        apiKey: process.env.MG_API_KEY,
        enabled: process.env.MG_ENABLED === 'true'
      },
      wise: {
        apiUrl: process.env.WISE_API_URL,
        apiKey: process.env.WISE_API_KEY,
        enabled: process.env.WISE_ENABLED === 'true'
      }
    };
  }

  async sendRemittance(remittanceData, partnerId = 'western_union') {
    try {
      const partner = this.partners[partnerId];
      
      if (!partner || !partner.enabled) {
        throw new Error(`Partner ${partnerId} is not available`);
      }

      const requestData = this.formatRemittanceData(remittanceData, partnerId);
      
      const response = await axios.post(
        `${partner.apiUrl}/send`,
        requestData,
        {
          headers: {
            'Authorization': `Bearer ${partner.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );

      return {
        success: true,
        partnerTransactionId: response.data.transactionId,
        trackingNumber: response.data.trackingNumber,
        estimatedDelivery: response.data.estimatedDelivery,
        fees: response.data.fees,
        exchangeRate: response.data.exchangeRate
      };

    } catch (error) {
      logger.error('Remittance partner API error:', error);
      return {
        success: false,
        error: error.message,
        errorCode: error.response?.data?.errorCode
      };
    }
  }

  async checkRemittanceStatus(partnerTransactionId, partnerId) {
    try {
      const partner = this.partners[partnerId];
      
      const response = await axios.get(
        `${partner.apiUrl}/status/${partnerTransactionId}`,
        {
          headers: {
            'Authorization': `Bearer ${partner.apiKey}`
          }
        }
      );

      return {
        status: response.data.status,
        currentLocation: response.data.location,
        deliveryDate: response.data.deliveryDate,
        lastUpdate: response.data.lastUpdate
      };

    } catch (error) {
      logger.error('Status check error:', error);
      throw error;
    }
  }

  formatRemittanceData(data, partnerId) {
    // Convert our internal format to partner-specific format
    const baseFormat = {
      sender: {
        firstName: data.sender.name.split(' ')[0],
        lastName: data.sender.name.split(' ').slice(1).join(' '),
        phone: data.sender.phone,
        address: data.sender.address,
        nationalId: data.sender.nationalId
      },
      receiver: {
        firstName: data.receiver.name.split(' ')[0],
        lastName: data.receiver.name.split(' ').slice(1).join(' '),
        phone: data.receiver.phone,
        address: data.receiver.address
      },
      amount: {
        send: data.amount.sent,
        receive: data.amount.received,
        sendCurrency: data.amount.sentCurrency,
        receiveCurrency: data.amount.receivedCurrency
      },
      deliveryMethod: data.deliveryMethod,
      purpose: data.purpose || 'family_support'
    };

    // Partner-specific formatting
    switch (partnerId) {
      case 'western_union':
        return this.formatForWesternUnion(baseFormat);
      case 'moneygram':
        return this.formatForMoneyGram(baseFormat);
      case 'wise':
        return this.formatForWise(baseFormat);
      default:
        return baseFormat;
    }
  }

  formatForWesternUnion(data) {
    return {
      ...data,
      serviceType: 'MONEY_TRANSFER',
      fundingSource: 'CASH',
      deliveryMethod: data.deliveryMethod === 'cash_pickup' ? 'CASH_PICKUP' : 'BANK_ACCOUNT'
    };
  }

  formatForMoneyGram(data) {
    return {
      ...data,
      productType: 'EXPRESS',
      receiveMethod: data.deliveryMethod
    };
  }

  formatForWise(data) {
    return {
      ...data,
      transferType: 'STANDARD',
      paymentMethod: 'BANK_TRANSFER'
    };
  }
}

module.exports = new RemittancePartnerService();
