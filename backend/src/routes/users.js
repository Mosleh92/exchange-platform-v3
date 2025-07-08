const express = require("express");
const router = express.Router();
// Mock route for testing
router.get("/", (req, res) => res.json({ success: true, users: [] }));
module.exports = router;
