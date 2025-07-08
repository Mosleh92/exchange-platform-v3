const express = require("express");
const router = express.Router();
const {
  createSalesPlan,
  getSalesPlans,
  getSalesPlanById,
  updateSalesPlan,
  deleteSalesPlan,
} = require("../controllers/salesPlan.controller");

const { protect, superAdmin } = require("../middleware/auth");

// All routes in this file are protected and only accessible by super admins.
// The '/api/super-admin/sales-plans' prefix will be added in server.js
router
  .route("/")
  .post(protect, superAdmin, createSalesPlan)
  .get(protect, superAdmin, getSalesPlans);

router
  .route("/:id")
  .get(protect, superAdmin, getSalesPlanById)
  .put(protect, superAdmin, updateSalesPlan)
  .delete(protect, superAdmin, deleteSalesPlan);

module.exports = router;
