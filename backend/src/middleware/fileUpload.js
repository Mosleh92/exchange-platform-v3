const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const NodeClam = require('clamscan');
const fs = require('fs');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'backend/uploads/tmp'); // مسیر موقت برای اسکن ویروس
  },
  filename: (req, file, cb) => {
    cb(null, uuidv4() + path.extname(file.originalname));
  }
});

const allowedMimeTypes = ['image/jpeg', 'image/png', 'application/pdf'];

const fileFilter = (req, file, cb) => {
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('فرمت فایل مجاز نیست!'));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // ۵ مگابایت
});

async function virusScan(req, res, next) {
  if (!req.file) return next();
  try {
    const clamscan = await new NodeClam().init();
    const { isInfected } = await clamscan.isInfected(req.file.path);
    if (isInfected) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'فایل آلوده به ویروس است!' });
    }
    next();
  } catch (err) {
    fs.unlinkSync(req.file.path);
    return res.status(500).json({ error: 'خطا در اسکن ویروس!' });
  }
}

module.exports = { upload, virusScan }; 