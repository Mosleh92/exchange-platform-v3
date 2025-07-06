require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const request = require('supertest');
const app = require('../server'); // اصلاح مسیر به جای '../src/server'

// توکن‌های فرضی برای هر نقش (در پروژه واقعی باید با login واقعی ساخته شوند)
const tokens = {
  super_admin: 'SUPER_ADMIN_TOKEN',
  tenant_admin: 'TENANT_ADMIN_TOKEN',
  branch_manager: 'BRANCH_MANAGER_TOKEN',
  staff: 'STAFF_TOKEN',
  customer: 'CUSTOMER_TOKEN'
};

describe('RBAC Security Test', () => {
  it('customer should NOT access admin route', async () => {
    const res = await request(app)
      .get('/api/super-admin/tenants')
      .set('Authorization', `Bearer ${tokens.customer}`);
    expect(res.status).toBe(403);
  });

  it('tenant_admin should access tenant dashboard', async () => {
    const res = await request(app)
      .get('/api/tenant/dashboard')
      .set('Authorization', `Bearer ${tokens.tenant_admin}`);
    expect([200, 302]).toContain(res.status); // 302 اگر ریدایرکت داشبورد باشد
  });

  it('super_admin should NOT access tenant-only route', async () => {
    const res = await request(app)
      .get('/api/tenant/dashboard')
      .set('Authorization', `Bearer ${tokens.super_admin}`);
    expect(res.status).toBe(403);
  });

  it('branch_manager should NOT access super admin route', async () => {
    const res = await request(app)
      .get('/api/super-admin/tenants')
      .set('Authorization', `Bearer ${tokens.branch_manager}`);
    expect(res.status).toBe(403);
  });

  it('staff should NOT access branch manager route', async () => {
    const res = await request(app)
      .get('/api/branch/manager')
      .set('Authorization', `Bearer ${tokens.staff}`);
    expect(res.status).toBe(403);
  });

  it('customer should access only own dashboard', async () => {
    const res = await request(app)
      .get('/api/customer/dashboard')
      .set('Authorization', `Bearer ${tokens.customer}`);
    expect([200, 302]).toContain(res.status);
  });
}); 