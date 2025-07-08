const express = require("express");
const router = express.Router();
const { upload, virusScan } = require("../middleware/fileUpload");
const auth = require("../middleware/auth");
const documentController = require("../controllers/document.controller");

router.post(
  "/upload",
  auth,
  upload.single("file"),
  virusScan,
  documentController.upload,
);
router.get("/download/:id", auth, documentController.download);
router.delete("/delete/:id", auth, documentController.delete);

module.exports = router;
