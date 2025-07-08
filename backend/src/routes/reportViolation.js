const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const reportViolationController = require("../controllers/reportViolation.controller");

router.post("/", auth, reportViolationController.create);
router.get("/", auth, reportViolationController.list);

module.exports = router;
