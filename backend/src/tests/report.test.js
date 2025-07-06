require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const request = require('supertest');
const app = require('../server');
const mongoose = require('mongoose');
const Transaction = require('../models/Transaction');
const Discrepancy = require('../models/Discrepancy');
const User = require('../models/User');
const jwt = require('jsonwebtoken');

// توکن تستی برای tenant1 و tenant2
const tenant1 = new mongoose.Types.ObjectId();
const tenant2 = new mongoose.Types.ObjectId();
const branch1 = new mongoose.Types.ObjectId();
const branch2 = new mongoose.Types.ObjectId();
const user1 = new mongoose.Types.ObjectId();
const user2 = new mongoose.Types.ObjectId();
const token1 = jwt.sign({ _id: user1, tenantId: tenant1, branchId: branch1, role: 'tenant_admin' }, 'testsecret');
const token2 = jwt.sign({ _id: user2, tenantId: tenant2, branchId: branch2, role: 'tenant_admin' }, 'testsecret');
const tokenCustomer = jwt.sign({ _id: new mongoose.Types.ObjectId(), tenantId: tenant1, branchId: branch1, role: 'customer' }, 'testsecret');
const tokenStaff = jwt.sign({ _id: new mongoose.Types.ObjectId(), tenantId: tenant1, branchId: branch1, role: 'staff' }, 'testsecret');
const tokenSuperAdmin = jwt.sign({ _id: new mongoose.Types.ObjectId(), role: 'super_admin' }, 'testsecret');

beforeAll(async () => {
  await mongoose.connect('mongodb://localhost:27017/exchange_test', { useNewUrlParser: true, useUnifiedTopology: true });
  await Transaction.deleteMany({});
  await Discrepancy.deleteMany({});
  // داده تستی
  await Transaction.create([
    { tenantId: tenant1, branchId: branch1, type: 'payment', amount: 1000, createdAt: new Date('2024-01-10') },
    { tenantId: tenant1, branchId: branch1, type: 'payment', amount: 2000, createdAt: new Date('2024-01-15') },
    { tenantId: tenant2, branchId: branch2, type: 'payment', amount: 3000, createdAt: new Date('2024-01-20') }
  ]);
  await Discrepancy.create([
    { tenantId: tenant1, branchId: branch1, transactionId: new mongoose.Types.ObjectId(), expected: 1000, paid: 900, status: 'underpaid' },
    { tenantId: tenant2, branchId: branch2, transactionId: new mongoose.Types.ObjectId(), expected: 3000, paid: 3500, status: 'overpaid' }
  ]);
});

afterAll(async () => {
  await mongoose.connection.close();
});

describe('گزارش مالی و مغایرت‌ها', () => {
  it('باید فقط گزارش مالی tenant1 را برگرداند', async () => {
    const res = await request(app)
      .get('/api/reports/financial?from=2024-01-01&to=2024-01-31')
      .set('Authorization', `Bearer ${token1}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.transactions.length).toBeGreaterThan(0);
    res.body.transactions.forEach(t => {
      expect(['payment']).toContain(t._id);
    });
  });

  it('نباید tenant2 به داده‌های tenant1 دسترسی داشته باشد', async () => {
    const res = await request(app)
      .get('/api/reports/financial?from=2024-01-01&to=2024-01-31')
      .set('Authorization', `Bearer ${token2}`);
    expect(res.statusCode).toBe(200);
    res.body.transactions.forEach(t => {
      expect(t.total).not.toBe(3000); // داده tenant1 نباید دیده شود
    });
  });

  it('گزارش مغایرت‌های tenant1 فقط باید مغایرت‌های خودش را برگرداند', async () => {
    const res = await request(app)
      .get('/api/reports/discrepancies')
      .set('Authorization', `Bearer ${token1}`);
    expect(res.statusCode).toBe(200);
    res.body.discrepancies.forEach(d => {
      expect(String(d.tenantId)).toBe(String(tenant1));
    });
  });

  it('tenant2 نباید مغایرت‌های tenant1 را ببیند', async () => {
    const res = await request(app)
      .get('/api/reports/discrepancies')
      .set('Authorization', `Bearer ${token2}`);
    expect(res.statusCode).toBe(200);
    res.body.discrepancies.forEach(d => {
      expect(String(d.tenantId)).toBe(String(tenant2));
    });
  });
});

describe('تست نقش‌ها و سناریوهای خطا', () => {
  it('customer نباید به گزارش مالی دسترسی داشته باشد', async () => {
    const res = await request(app)
      .get('/api/reports/financial')
      .set('Authorization', `Bearer ${tokenCustomer}`);
    expect(res.statusCode).toBe(403);
  });

  it('staff نباید به گزارش مغایرت‌ها دسترسی داشته باشد', async () => {
    const res = await request(app)
      .get('/api/reports/discrepancies')
      .set('Authorization', `Bearer ${tokenStaff}`);
    expect(res.statusCode).toBe(403);
  });

  it('super_admin باید به گزارش مالی دسترسی داشته باشد', async () => {
    const res = await request(app)
      .get('/api/reports/financial')
      .set('Authorization', `Bearer ${tokenSuperAdmin}`);
    expect([200, 204]).toContain(res.statusCode); // بسته به پیاده‌سازی
  });

  it('در صورت نبود توکن باید 401 برگردد', async () => {
    const res = await request(app)
      .get('/api/reports/financial');
    expect(res.statusCode).toBe(401);
  });

  it('در صورت توکن نامعتبر باید 401 برگردد', async () => {
    const res = await request(app)
      .get('/api/reports/financial')
      .set('Authorization', 'Bearer invalidtoken');
    expect(res.statusCode).toBe(401);
  });
});