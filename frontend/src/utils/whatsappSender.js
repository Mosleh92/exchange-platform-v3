// src/utils/whatsappSender.js
export const sendWhatsAppMessage = async (groupId, message) => {
  try {
    // Integration with WhatsApp Business API
    const response = await fetch('/api/whatsapp/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        groupId,
        message,
        timestamp: new Date().toISOString()
      })
    });

    if (response.ok) {
      console.log('Message sent to WhatsApp group');
      return true;
    }
  } catch (error) {
    console.error('WhatsApp send failed:', error);
    return false;
  }
};

export const createReceiptMessage = (transaction) => {
  return `
📄 *Receipt/رسید*
━━━━━━━━━━━━━━━
📱 ID: ${transaction.id}
👤 Customer: ${transaction.customerName}
💰 Amount: ${transaction.amount} ${transaction.currency}
🏦 Account: ${transaction.accountNumber}
📅 Date: ${new Date().toLocaleDateString()}
⏰ Time: ${new Date().toLocaleTimeString()}
━━━━━━━━━━━━━━━
✅ Transaction Completed
  `;
};