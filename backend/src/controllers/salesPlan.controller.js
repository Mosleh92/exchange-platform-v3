const SalesPlan = require('../models/SalesPlan');
const asyncHandler = require('express-async-handler');

// @desc    Create a new sales plan
// @route   POST /api/super-admin/sales-plans
// @access  Private/SuperAdmin
const createSalesPlan = asyncHandler(async (req, res) => {
  const { name, price, currency, duration, features, isDefault } = req.body;
  const tenantId = req.user.tenantId;

  if (!tenantId) {
    res.status(400);
    throw new Error('Tenant ID is required');
  }

  const salesPlanExists = await SalesPlan.findOne({ name, tenant_id: tenantId });

  if (salesPlanExists) {
    res.status(400);
    throw new Error('Sales plan with this name already exists in this tenant');
  }

  const salesPlan = new SalesPlan({
    tenant_id: tenantId,
    name,
    price,
    currency,
    duration,
    features,
    isDefault
  });

  const createdPlan = await salesPlan.save();
  res.status(201).json(createdPlan);
});

// @desc    Get all sales plans
// @route   GET /api/super-admin/sales-plans
// @access  Private/SuperAdmin
const getSalesPlans = asyncHandler(async (req, res) => {
  const tenantId = req.user.tenantId;
  if (!tenantId) {
    res.status(400);
    throw new Error('Tenant ID is required');
  }
  
  const salesPlans = await SalesPlan.find({ tenant_id: tenantId });
  res.json(salesPlans);
});

// @desc    Get sales plan by ID
// @route   GET /api/super-admin/sales-plans/:id
// @access  Private/SuperAdmin
const getSalesPlanById = asyncHandler(async (req, res) => {
  const tenantId = req.user.tenantId;
  
  if (!tenantId) {
    res.status(400);
    throw new Error('Tenant ID is required');
  }

  const salesPlan = await SalesPlan.findOne({ _id: req.params.id, tenant_id: tenantId });

  if (salesPlan) {
    res.json(salesPlan);
  } else {
    res.status(404);
    throw new Error('Sales plan not found');
  }
});

// @desc    Update a sales plan
// @route   PUT /api/super-admin/sales-plans/:id
// @access  Private/SuperAdmin
const updateSalesPlan = asyncHandler(async (req, res) => {
  const { name, price, currency, duration, features, isActive, isDefault } = req.body;
  const tenantId = req.user.tenantId;

  if (!tenantId) {
    res.status(400);
    throw new Error('Tenant ID is required');
  }

  const salesPlan = await SalesPlan.findOne({ _id: req.params.id, tenant_id: tenantId });

  if (salesPlan) {
    salesPlan.name = name || salesPlan.name;
    salesPlan.price = price || salesPlan.price;
    salesPlan.currency = currency || salesPlan.currency;
    salesPlan.duration = duration || salesPlan.duration;
    salesPlan.features = features || salesPlan.features;
    salesPlan.isActive = isActive !== undefined ? isActive : salesPlan.isActive;
    salesPlan.isDefault = isDefault !== undefined ? isDefault : salesPlan.isDefault;

    const updatedPlan = await salesPlan.save();
    res.json(updatedPlan);
  } else {
    res.status(404);
    throw new Error('Sales plan not found');
  }
});

// @desc    Delete a sales plan
// @route   DELETE /api/super-admin/sales-plans/:id
// @access  Private/SuperAdmin
const deleteSalesPlan = asyncHandler(async (req, res) => {
  const tenantId = req.user.tenantId;

  if (!tenantId) {
    res.status(400);
    throw new Error('Tenant ID is required');
  }

  const salesPlan = await SalesPlan.findOne({ _id: req.params.id, tenant_id: tenantId });

  if (salesPlan) {
    if (salesPlan.isDefault) {
        res.status(400);
        throw new Error('Cannot delete the default plan. Please set another plan as default first.');
    }
    await salesPlan.remove();
    res.json({ message: 'Sales plan removed' });
  } else {
    res.status(404);
    throw new Error('Sales plan not found');
  }
});


module.exports = {
  createSalesPlan,
  getSalesPlans,
  getSalesPlanById,
  updateSalesPlan,
  deleteSalesPlan,
};
