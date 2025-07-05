// const crypto = require('crypto'); // Unused
const QRCode = require('qrcode');
const jwt = require('jsonwebtoken');
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

const QR_SECRET = process.env.QR_SECRET;
if (!QR_SECRET) throw new Error('QR_SECRET is not set in environment variables!');

exports.generateSecretCode = () => {
  // ترکیب حروف بزرگ، کوچک و عدد، ۸ کاراکتر
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  let code = '';
  for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
};

exports.generateQRCode = async (payload) => {
  // payload: { id, secretCode }
  const token = jwt.sign(payload, QR_SECRET, { expiresIn: '3d' });
  return await QRCode.toDataURL(token);
};

exports.verifyQRCode = (token) => {
  try {
    return jwt.verify(token, QR_SECRET);
  } catch {
    return null;
  }
};