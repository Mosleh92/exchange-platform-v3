const tenantFilter = (req, res, next) => {
  if (!req.tenantId) {
    return next(new Error('tenant_id not found in request'));
  }
  
  // اضافه کردن فیلتر tenant به تمام کوئریها
  const originalQuery = req.query;
  req.query = {
    ...originalQuery,
    tenant_id: req.tenantId
  };
  
  next();
};

module.exports = tenantFilter;