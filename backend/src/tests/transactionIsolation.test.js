require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const request = require('supertest');
const app = require('../server');
const mongoose = require('mongoose');
const User = require('../models/User');
const Account = require('../models/Account');
const Transaction = require('../models/Transaction');

// فرض: توکن JWT و setup دیتابیس تستی موجود است

describe('Transaction Balance Validation', () => {
  let token, user, tenantId, account;

  beforeAll(async () => {
    // ایجاد کاربر و حساب با موجودی محدود
    user = await User.create({
      username: 'testuser',
      email: 'testuser@example.com',
      password: 'Test@1234',
      fullName: 'Test User',
      role: 'customer',
      status: 'active',
      tenantId: new mongoose.Types.ObjectId()
    });
    tenantId = user.tenantId;
    account = await Account.create({
      customerId: user._id,
      tenantId,
      currency: 'USD',
      availableBalance: 100,
      status: 'active'
    });
    // فرض: توکن JWT معتبر برای user ساخته شود
    token = 'YOUR_JWT_TOKEN'; // این مقدار باید با توکن واقعی جایگزین شود
  });

  afterAll(async () => {
    await Transaction.deleteMany({});
    await Account.deleteMany({});
    await User.deleteMany({});
    await mongoose.connection.close();
  });

  it('should reject withdrawal if balance is insufficient', async () => {
    const res = await request(app)
      .post('/api/transactions')
      .set('Authorization', `Bearer ${token}`)
      .send({
        type: 'currency_sell',
        fromCurrency: 'USD',
        toCurrency: 'IRR',
        amount: 200, // بیشتر از موجودی
        paymentMethod: 'cash',
        deliveryMethod: 'cash',
        notes: 'withdraw test'
      });
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/موجودی کافی نیست/);
  });
});