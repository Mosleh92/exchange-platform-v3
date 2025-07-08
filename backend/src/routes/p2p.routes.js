const express = require("express");
const router = express.Router();
const p2pController = require("../controllers/p2p.controller");
const { authenticate, authorize } = require("../middleware/auth");
const {
  validateP2POrder,
  validateP2PMessage,
  validateP2POffer,
} = require("../middleware/validation");

// Apply authentication and tenant middleware to all routes
router.use(authenticate);
router.use(require("../middleware/tenant"));

// P2P Orders Routes
router.get(
  "/orders",
  authorize(["admin", "manager", "staff"]),
  p2pController.getAllOrders,
);

router.get(
  "/orders/my",
  authorize(["admin", "manager", "staff"]),
  p2pController.getMyOrders,
);

router.post(
  "/orders",
  authorize(["admin", "manager", "staff"]),
  validateP2POrder,
  p2pController.createOrder,
);

router.get(
  "/orders/:orderId",
  authorize(["admin", "manager", "staff"]),
  p2pController.getOrderById,
);

router.put(
  "/orders/:orderId",
  authorize(["admin", "manager", "staff"]),
  validateP2POrder,
  p2pController.updateOrder,
);

router.delete(
  "/orders/:orderId",
  authorize(["admin", "manager", "staff"]),
  p2pController.deleteOrder,
);

// P2P Chat Routes
router.post(
  "/orders/:orderId/chat",
  authorize(["admin", "manager", "staff"]),
  p2pController.createChat,
);

router.get(
  "/chats",
  authorize(["admin", "manager", "staff"]),
  p2pController.getMyChats,
);

router.get(
  "/chats/:chatId/messages",
  authorize(["admin", "manager", "staff"]),
  p2pController.getChatMessages,
);

router.post(
  "/chats/:chatId/messages",
  authorize(["admin", "manager", "staff"]),
  validateP2PMessage,
  p2pController.sendMessage,
);

router.post(
  "/chats/:chatId/offers",
  authorize(["admin", "manager", "staff"]),
  validateP2POffer,
  p2pController.makeOffer,
);

router.put(
  "/chats/:chatId/offers/:offerId/respond",
  authorize(["admin", "manager", "staff"]),
  p2pController.respondToOffer,
);

// ارسال پیشنهاد جدید در چت P2P
router.post(
  "/chats/:chatId/send-offer",
  authorize(["admin", "manager", "staff"]),
  p2pController.sendOfferInChat,
);

// پاسخ به پیشنهاد (تایید یا رد) در چت P2P
router.post(
  "/chats/:chatId/respond-offer",
  authorize(["admin", "manager", "staff"]),
  p2pController.respondToOfferInChat,
);

// Online Status
router.put(
  "/status",
  authorize(["admin", "manager", "staff"]),
  p2pController.updateOnlineStatus,
);

module.exports = router;
