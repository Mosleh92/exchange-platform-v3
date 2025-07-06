const TenantPlan = require('../models/TenantPlan');
const Plan = require('../models/Plan');
const User = require('../models/User');
const Branch = require('../models/Branch');
// سایر مدل‌ها در صورت نیاز

exports.checkPlanLimit = async (tenantId, type) => {
  // type: 'user', 'branch', 'currency', 'transactionVolume'
  const tenantPlan = await TenantPlan.findOne({ tenantId, status: 'active' }).populate('planId');
  if (!tenantPlan || !tenantPlan.planId) return { allowed: false, reason: 'پلن فعال یافت نشد' };
  const plan = tenantPlan.planId;

  if (type === 'user') {
    const count = await User.countDocuments({ tenantId });
    if (plan.userLimit && count >= plan.userLimit) {
      return { allowed: false, reason: 'تعداد کاربران بیش از حد مجاز پلن است' };
    }
  }
  if (type === 'branch') {
    const count = await Branch.countDocuments({ tenantId });
    if (plan.branchLimit && count >= plan.branchLimit) {
      return { allowed: false, reason: 'تعداد شعب بیش از حد مجاز پلن است' };
    }
  }
  // سایر محدودیت‌ها (currency, transactionVolume) مشابه همین
  return { allowed: true };
}; 