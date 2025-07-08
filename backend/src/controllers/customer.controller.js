const Customer = require("../models/Customer");
const FinancialService = require("../services/financialService");
const { validationResult } = require("express-validator");

class CustomerController {
  // Get customers with proper tenant and branch filtering
  async getCustomers(req, res) {
    try {
      const { page = 1, limit = 50 } = req.query;

      // Build query with tenant isolation
      const query = { tenantId: req.user.tenantId };

      // Add branch filtering for staff
      if (req.user.role === "STAFF") {
        query.branchId = req.user.branchId;
      }

      const customers = await Customer.find(query)
        .select("-balances") // Don't expose balances in list view
        .populate("branchId", "name")
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);

      const total = await Customer.countDocuments(query);

      res.json({
        customers,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      res.status(500).json({
        error: "Failed to fetch customers",
        details: error.message,
      });
    }
  }

  // Get single customer with balance (authorized access only)
  async getCustomer(req, res) {
    try {
      const { id } = req.params;

      const query = {
        _id: id,
        tenantId: req.user.tenantId,
      };

      // Add branch filtering for staff
      if (req.user.role === "STAFF") {
        query.branchId = req.user.branchId;
      }

      const customer = await Customer.findOne(query)
        .populate("branchId", "name")
        .populate("tenantId", "name");

      if (!customer) {
        return res.status(404).json({ error: "Customer not found" });
      }

      res.json(customer);
    } catch (error) {
      res.status(500).json({
        error: "Failed to fetch customer",
        details: error.message,
      });
    }
  }

  // Create customer with proper validation
  async createCustomer(req, res) {
    try {
      // Validate input
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: "Validation failed",
          details: errors.array(),
        });
      }

      const { name, email, phone, initialBalance = {} } = req.body;

      // Validate initial balance amounts
      for (const [currency, amount] of Object.entries(initialBalance)) {
        if (typeof amount !== "number" || amount < 0) {
          return res.status(400).json({
            error: `Invalid initial balance for ${currency}`,
          });
        }

        // Set reasonable limits (e.g., max $100,000 initial balance)
        if (amount > 100000) {
          return res.status(400).json({
            error: `Initial balance for ${currency} exceeds maximum allowed`,
          });
        }
      }

      // Check for duplicate email within tenant
      const existingCustomer = await Customer.findOne({
        email: email.toLowerCase(),
        tenantId: req.user.tenantId,
      });

      if (existingCustomer) {
        return res.status(409).json({
          error: "Customer with this email already exists",
        });
      }

      // Create customer
      const customer = new Customer({
        name,
        email: email.toLowerCase(),
        phone,
        balances: new Map(Object.entries(initialBalance)),
        tenantId: req.user.tenantId,
        branchId: req.user.branchId,
        createdBy: req.user.userId,
        status: "active",
      });

      await customer.save();

      // Log customer creation
      await AuditLog.create({
        eventType: "CUSTOMER_CREATED",
        details: {
          customerId: customer._id,
          name,
          email,
          createdBy: req.user.userId,
          tenantId: req.user.tenantId,
          branchId: req.user.branchId,
          initialBalance,
        },
        timestamp: new Date(),
      });

      res.status(201).json(customer);
    } catch (error) {
      res.status(500).json({
        error: "Failed to create customer",
        details: error.message,
      });
    }
  }

  // Update customer balance (admin only)
  async updateBalance(req, res) {
    try {
      const { id } = req.params;
      const { currency, amount, reason } = req.body;

      // Only admins can manually update balances
      if (!["SUPER_ADMIN", "TENANT_ADMIN"].includes(req.user.role)) {
        return res.status(403).json({
          error: "Only admins can update balances",
        });
      }

      const result = await FinancialService.updateBalance(
        id,
        currency,
        amount,
        amount > 0 ? "MANUAL_CREDIT" : "MANUAL_DEBIT",
        {
          reason,
          updatedBy: req.user.userId,
          adminAction: true,
        },
      );

      res.json({
        success: true,
        newBalance: result.newBalance,
        transaction: result.transaction,
      });
    } catch (error) {
      res.status(400).json({
        error: "Failed to update balance",
        details: error.message,
      });
    }
  }
}

module.exports = new CustomerController();
