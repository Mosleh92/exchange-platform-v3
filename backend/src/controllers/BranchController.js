const Branch = require('../models/Branch');
const User = require('../models/User');
const { DatabaseManager } = require('../config/database');
const { logger } = require('../utils/logger');
const { generateBranchCode } = require('../utils/helpers');

class BranchController {
  // Create new branch
  async createBranch(req, res) {
    try {
      const { tenantId, role } = req.user;
      
      // Check permissions
      if (!['super_admin', 'tenant_admin'].includes(role)) {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions'
        });
      }

      const {
        name,
        code,
        type = 'sub',
        contact,
        location,
        managerId,
        operatingHours,
        services = [],
        currencies = [],
        cashLimits,
        settings,
        parentBranchId
      } = req.body;

      // Validate manager
      if (managerId) {
        const manager = await User.findById(managerId);
        if (!manager || manager.tenantId.toString() !== tenantId) {
          return res.status(400).json({
            success: false,
            message: 'Invalid manager selected'
          });
        }
      }

      // Generate branch code if not provided
      const branchCode = code || await generateBranchCode(tenantId);

      // Create branch
      const branch = new Branch({
        tenantId,
        name,
        code: branchCode,
        type,
        contact,
        location,
        manager: managerId,
        operatingHours: operatingHours || this.getDefaultOperatingHours(),
        services,
        currencies,
        cashLimits,
        settings,
        parentBranch: parentBranchId
      });

      await branch.save();

      // Update parent branch if specified
      if (parentBranchId) {
        await Branch.findByIdAndUpdate(parentBranchId, {
          $push: { childBranches: branch._id }
        });
      }

      // Update manager's role if specified
      if (managerId) {
        await User.findByIdAndUpdate(managerId, {
          role: 'branch_admin',
          branchId: branch._id
        });
      }

      // Log activity
      await this.logActivity(tenantId, req.user.id, 'CREATE_BRANCH', branch._id, {
        branchName: name,
        branchCode: branchCode
      });

      res.status(201).json({
        success: true,
        message: 'Branch created successfully',
        branch: await branch.populate(['manager', 'parentBranch'])
      });

    } catch (error) {
      logger.error('Error creating branch:', error);
      
      if (error.code === 11000) {
        return res.status(400).json({
          success: false,
          message: 'Branch code already exists'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Error creating branch'
      });
    }
  }

  // Get all branches for tenant
  async getBranches(req, res) {
    try {
      const { tenantId } = req.user;
      const { 
        page = 1, 
        limit = 10, 
        status, 
        type, 
        city, 
        managerId,
        search 
      } = req.query;

      const filter = { tenantId };
      
      if (status) filter.status = status;
      if (type) filter.type = type;
      if (city) filter['contact.address.city'] = new RegExp(city, 'i');
      if (managerId) filter.manager = managerId;
      if (search) {
        filter.$or = [
          { name: new RegExp(search, 'i') },
          { code: new RegExp(search, 'i') },
          { 'contact.address.city': new RegExp(search, 'i') }
        ];
      }

      const branches = await Branch.find(filter)
        .populate('manager', 'profile.firstName profile.lastName email')
        .populate('parentBranch', 'name code')
        .populate('childBranches', 'name code status')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit));

      const total = await Branch.countDocuments(filter);

      res.json({
        success: true,
        branches,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      });

    } catch (error) {
      logger.error('Error fetching branches:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching branches'
      });
    }
  }

  // Get single branch
  async getBranch(req, res) {
    try {
      const { tenantId } = req.user;
      const { branchId } = req.params;

      const branch = await Branch.findOne({ _id: branchId, tenantId })
        .populate('manager', 'profile.firstName profile.lastName email phone')
        .populate('staff.userId', 'profile.firstName profile.lastName email')
        .populate('parentBranch', 'name code')
        .populate('childBranches', 'name code status');

      if (!branch) {
        return res.status(404).json({
          success: false,
          message: 'Branch not found'
        });
      }

      // Get branch statistics
      const stats = await this.getBranchStatistics(tenantId, branchId);

      res.json({
        success: true,
        branch: {
          ...branch.toObject(),
          statistics: stats
        }
      });

    } catch (error) {
      logger.error('Error fetching branch:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching branch'
      });
    }
  }

  // Update branch
  async updateBranch(req, res) {
    try {
      const { tenantId, role } = req.user;
      const { branchId } = req.params;

      // Check permissions
      if (!['super_admin', 'tenant_admin', 'branch_admin'].includes(role)) {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions'
        });
      }

      const updates = req.body;
      
      // Remove sensitive fields that shouldn't be updated directly
      delete updates.tenantId;
      delete updates.statistics;
      delete updates.createdAt;
      delete updates.updatedAt;

      const branch = await Branch.findOneAndUpdate(
        { _id: branchId, tenantId },
        updates,
        { new: true, runValidators: true }
      ).populate('manager', 'profile.firstName profile.lastName email');

      if (!branch) {
        return res.status(404).json({
          success: false,
          message: 'Branch not found'
        });
      }

      // Log activity
      await this.logActivity(tenantId, req.user.id, 'UPDATE_BRANCH', branch._id, {
        branchName: branch.name,
        updates: Object.keys(updates)
      });

      res.json({
        success: true,
        message: 'Branch updated successfully',
        branch
      });

    } catch (error) {
      logger.error('Error updating branch:', error);
      res.status(500).json({
        success: false,
        message: 'Error updating branch'
      });
    }
  }

  // Delete branch
  async deleteBranch(req, res) {
    try {
      const { tenantId, role } = req.user;
      const { branchId } = req.params;

      // Check permissions
      if (!['super_admin', 'tenant_admin'].includes(role)) {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions'
        });
      }

      const branch = await Branch.findOne({ _id: branchId, tenantId });
      
      if (!branch) {
        return res.status(404).json({
          success: false,
          message: 'Branch not found'
        });
      }

      // Check if branch has active transactions
      const hasActiveTransactions = await this.checkActiveTransactions(tenantId, branchId);
      if (hasActiveTransactions) {
        return res.status(400).json({
          success: false,
          message: 'Cannot delete branch with active transactions'
        });
      }

      // Remove branch from parent's children
      if (branch.parentBranch) {
        await Branch.findByIdAndUpdate(branch.parentBranch, {
          $pull: { childBranches: branchId }
        });
      }

      // Update child branches
      if (branch.childBranches.length > 0) {
        await Branch.updateMany(
          { _id: { $in: branch.childBranches } },
          { $unset: { parentBranch: 1 } }
        );
      }

      // Update staff users
      const staffUsers = await User.find({ branchId: branchId });
      for (const user of staffUsers) {
        user.branchId = undefined;
        if (user.role === 'branch_admin') {
          user.role = 'staff';
        }
        await user.save();
      }

      // Delete branch
      await Branch.findByIdAndDelete(branchId);

      // Log activity
      await this.logActivity(tenantId, req.user.id, 'DELETE_BRANCH', branchId, {
        branchName: branch.name,
        branchCode: branch.code
      });

      res.json({
        success: true,
        message: 'Branch deleted successfully'
      });

    } catch (error) {
      logger.error('Error deleting branch:', error);
      res.status(500).json({
        success: false,
        message: 'Error deleting branch'
      });
    }
  }

  // Assign staff to branch
  async assignStaff(req, res) {
    try {
      const { tenantId, role } = req.user;
      const { branchId } = req.params;
      const { staffMembers } = req.body;

      // Check permissions
      if (!['super_admin', 'tenant_admin', 'branch_admin'].includes(role)) {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions'
        });
      }

      const branch = await Branch.findOne({ _id: branchId, tenantId });
      if (!branch) {
        return res.status(404).json({
          success: false,
          message: 'Branch not found'
        });
      }

      // Validate staff members
      const validStaffMembers = [];
      for (const staff of staffMembers) {
        const user = await User.findById(staff.userId);
        if (user && user.tenantId.toString() === tenantId) {
          validStaffMembers.push({
            userId: staff.userId,
            position: staff.position,
            permissions: staff.permissions || [],
            startDate: staff.startDate || new Date(),
            status: 'active'
          });

          // Update user's branch assignment
          await User.findByIdAndUpdate(staff.userId, {
            branchId: branchId
          });
        }
      }

      // Add staff to branch
      branch.staff.push(...validStaffMembers);
      await branch.save();

      // Log activity
      await this.logActivity(tenantId, req.user.id, 'ASSIGN_STAFF', branchId, {
        staffCount: validStaffMembers.length,
        branchName: branch.name
      });

      res.json({
        success: true,
        message: 'Staff assigned successfully',
        branch: await branch.populate('staff.userId', 'profile.firstName profile.lastName email')
      });

    } catch (error) {
      logger.error('Error assigning staff:', error);
      res.status(500).json({
        success: false,
        message: 'Error assigning staff'
      });
    }
  }

  // Remove staff from branch
  async removeStaff(req, res) {
    try {
      const { tenantId, role } = req.user;
      const { branchId, staffId } = req.params;

      // Check permissions
      if (!['super_admin', 'tenant_admin', 'branch_admin'].includes(role)) {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions'
        });
      }

      const branch = await Branch.findOne({ _id: branchId, tenantId });
      if (!branch) {
        return res.status(404).json({
          success: false,
          message: 'Branch not found'
        });
      }

      // Find and remove staff member
      const staffIndex = branch.staff.findIndex(s => s.userId.toString() === staffId);
      if (staffIndex === -1) {
        return res.status(404).json({
          success: false,
          message: 'Staff member not found in this branch'
        });
      }

      const staffMember = branch.staff[staffIndex];
      branch.staff.splice(staffIndex, 1);
      await branch.save();

      // Update user's branch assignment
      await User.findByIdAndUpdate(staffId, {
        $unset: { branchId: 1 }
      });

      // Log activity
      await this.logActivity(tenantId, req.user.id, 'REMOVE_STAFF', branchId, {
        staffId: staffId,
        branchName: branch.name
      });

      res.json({
        success: true,
        message: 'Staff removed successfully',
        removedStaff: staffMember
      });

    } catch (error) {
      logger.error('Error removing staff:', error);
      res.status(500).json({
        success: false,
        message: 'Error removing staff'
      });
    }
  }

  // Get branch statistics
  async getBranchStatistics(tenantId, branchId) {
    try {
      const connection = DatabaseManager.getTenantConnection(tenantId);
      
      // Get models
      const Transaction = connection.model('Transaction', require('../models/Transaction').schema);
      const Account = connection.model('Account', require('../models/Account').schema);
      const Customer = connection.model('Customer', require('../models/Customer').schema);

      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

      // Parallel queries for better performance
      const [
        totalCustomers,
        totalAccounts,
        dailyTransactions,
        monthlyTransactions,
        dailyVolume,
        monthlyVolume,
        accountBalances
      ] = await Promise.all([
        Customer.countDocuments({ branchId }),
        Account.countDocuments({ branchId }),
        Transaction.countDocuments({ 
          branchId, 
          createdAt: { $gte: startOfDay },
          status: 'completed'
        }),
        Transaction.countDocuments({ 
          branchId, 
          createdAt: { $gte: startOfMonth },
          status: 'completed'
        }),
        Transaction.aggregate([
          { 
            $match: { 
              branchId: mongoose.Types.ObjectId(branchId), 
              createdAt: { $gte: startOfDay },
              status: 'completed'
            }
          },
          { $group: { _id: null, total: { $sum: '$amount' } } }
        ]),
        Transaction.aggregate([
          { 
            $match: { 
              branchId: mongoose.Types.ObjectId(branchId), 
              createdAt: { $gte: startOfMonth },
              status: 'completed'
            }
          },
          { $group: { _id: null, total: { $sum: '$amount' } } }
        ]),
        Account.aggregate([
          { $match: { branchId: mongoose.Types.ObjectId(branchId) } },
          { $group: { _id: '$currency', total: { $sum: '$balance' } } }
        ])
      ]);

      return {
        totalCustomers,
        totalAccounts,
        dailyTransactions,
        monthlyTransactions,
        dailyVolume: dailyVolume[0]?.total || 0,
        monthlyVolume: monthlyVolume[0]?.total || 0,
        accountBalances: accountBalances.reduce((acc, item) => {
          acc[item._id] = item.total;
          return acc;
        }, {})
      };

    } catch (error) {
      logger.error('Error getting branch statistics:', error);
      return {
        totalCustomers: 0,
        totalAccounts: 0,
        dailyTransactions: 0,
        monthlyTransactions: 0,
        dailyVolume: 0,
        monthlyVolume: 0,
        accountBalances: {}
      };
    }
  }

  // Update branch currencies
  async updateCurrencies(req, res) {
    try {
      const { tenantId } = req.user;
      const { branchId } = req.params;
      const { currencies } = req.body;

      const branch = await Branch.findOne({ _id: branchId, tenantId });
      if (!branch) {
        return res.status(404).json({
          success: false,
          message: 'Branch not found'
        });
      }

      // Update currencies with current timestamp
      const updatedCurrencies = currencies.map(currency => ({
        ...currency,
        lastUpdated: new Date()
      }));

      branch.currencies = updatedCurrencies;
      await branch.save();

      // Log activity
      await this.logActivity(tenantId, req.user.id, 'UPDATE_CURRENCIES', branchId, {
        branchName: branch.name,
        currencyCount: updatedCurrencies.length
      });

      res.json({
        success: true,
        data: branch,
        message: 'Branch currencies updated successfully'
      });

    } catch (error) {
      logger.error('Update branch currencies error:', error);
      res.status(500).json({
        success: false,
        message: 'خطا در بروزرسانی ارزهای شعبه',
        error: error.message
      });
    }
  }
}
