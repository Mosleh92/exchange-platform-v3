const express = require('express');
const router = express.Router();
const tenantSettingsController = require('../controllers/tenantSettings.controller');
const auth = require('../middleware/auth');
const multer = require('multer');
const path = require('path');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../uploads/branding'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|svg/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Admin routes (requires admin role)
router.use(auth.requireRole(['admin', 'manager']));

// Get tenant settings
router.get('/', tenantSettingsController.getTenantSettings);

// Update tenant settings
router.put('/', tenantSettingsController.updateTenantSettings);

// Upload logo
router.post('/logo', upload.single('logo'), tenantSettingsController.uploadLogo);

// Upload favicon
router.post('/favicon', upload.single('favicon'), tenantSettingsController.uploadFavicon);

// Manage receipt templates
router.post('/receipt-templates', tenantSettingsController.manageReceiptTemplates);

// Test delivery settings
router.post('/test-delivery', tenantSettingsController.testDeliverySettings);

// Migration routes
router.post('/migration/start', tenantSettingsController.startDataMigration);
router.get('/migration/status', tenantSettingsController.getMigrationStatus);

module.exports = router; 