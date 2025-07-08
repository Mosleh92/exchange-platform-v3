const Document = require("../models/Document");
const fs = require("fs");
const path = require("path");

exports.upload = async (req, res) => {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ error: "فایل ارسال نشده است." });
    // مسیر نهایی بر اساس tenantId
    const destDir = path.join("backend", "uploads", String(req.user.tenantId));
    if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
    const destPath = path.join(destDir, file.filename);
    fs.renameSync(file.path, destPath);

    const doc = await Document.create({
      originalName: file.originalname,
      storedName: file.filename,
      path: destPath,
      mimeType: file.mimetype,
      size: file.size,
      tenantId: req.user.tenantId,
      branchId: req.user.branchId,
      userId: req.user._id,
    });
    res.json({ id: doc._id });
  } catch (err) {
    return res.status(500).json({ error: "خطا در ذخیره فایل." });
  }
};

exports.download = async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: "فایل یافت نشد." });
    // کنترل tenantId
    if (String(doc.tenantId) !== String(req.user.tenantId)) {
      return res.status(403).json({ error: "دسترسی غیرمجاز." });
    }
    // اگر branchId فایل ست شده بود، باید با branchId کاربر همخوانی داشته باشد (یا نقش مجاز باشد)
    if (
      doc.branchId &&
      String(doc.branchId) !== String(req.user.branchId) &&
      req.user.role !== "tenant_admin" &&
      req.user.role !== "super_admin"
    ) {
      return res.status(403).json({ error: "دسترسی غیرمجاز." });
    }
    // ارسال فایل
    res.download(doc.path, doc.originalName);
  } catch (err) {
    return res.status(500).json({ error: "خطا در دانلود فایل." });
  }
};

exports.delete = async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: "فایل یافت نشد." });
    // کنترل tenantId
    if (String(doc.tenantId) !== String(req.user.tenantId)) {
      return res.status(403).json({ error: "دسترسی غیرمجاز." });
    }
    // اگر branchId فایل ست شده بود، باید با branchId کاربر همخوانی داشته باشد (یا نقش مجاز باشد)
    if (
      doc.branchId &&
      String(doc.branchId) !== String(req.user.branchId) &&
      req.user.role !== "tenant_admin" &&
      req.user.role !== "super_admin"
    ) {
      return res.status(403).json({ error: "دسترسی غیرمجاز." });
    }
    // حذف رکورد دیتابیس
    await doc.deleteOne();
    // حذف فایل فیزیکی
    if (fs.existsSync(doc.path)) {
      fs.unlinkSync(doc.path);
    }
    res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: "خطا در حذف فایل." });
  }
};
