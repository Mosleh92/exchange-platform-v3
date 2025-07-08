const express = require("express");
const router = express.Router();
const holdingController = require("../controllers/holding.controller");
const { auth } = require("../middleware/auth");

router.get("/overview", auth, holdingController.overview);
router.get("/transactions", auth, holdingController.transactions);
router.get("/receipts", auth, holdingController.receipts);
router.get("/profile", auth, holdingController.profile);
router.get("/alerts", auth, holdingController.alerts);

// تغییر وضعیت هولد/تحویل برای یک تراکنش
router.post("/set-hold-status", auth, holdingController.setHoldStatus);

module.exports = router;
