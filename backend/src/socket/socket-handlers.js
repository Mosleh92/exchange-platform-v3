const { socketTenantAccess } = require("./socket-auth");
const mongoose = require("mongoose");

// **اصلاح شده**: Socket Event Handlers with Proper Authorization
const handleSocketEvents = (io, socket) => {
  console.log(`Socket ${socket.id} connected for user ${socket.user.userId}`);

  // **اصلاح شده**: Secure join-tenant event
  socket.on("join-tenant", (tenantId, callback) => {
    try {
      // Validate tenant ID format
      if (!mongoose.Types.ObjectId.isValid(tenantId)) {
        return callback({
          success: false,
          message: "Invalid tenant ID format",
        });
      }

      // Check tenant access
      socketTenantAccess(socket, tenantId, (error, hasAccess) => {
        if (error || !hasAccess) {
          return callback({
            success: false,
            message: error?.message || "Access denied to tenant",
          });
        }

        // Join tenant room
        socket.join(`tenant-${tenantId}`);

        // Also join user-specific room
        socket.join(`user-${socket.user.userId}`);

        // Join branch room if user has branch
        if (socket.user.branchId) {
          socket.join(`branch-${socket.user.branchId}`);
        }

        console.log(`Socket ${socket.id} joined tenant ${tenantId}`);

        callback({
          success: true,
          message: "Successfully joined tenant",
          rooms: socket.rooms,
        });
      });
    } catch (error) {
      console.error("Join tenant error:", error);
      callback({ success: false, message: "Server error" });
    }
  });

  // **اصلاح شده**: Secure leave-tenant event
  socket.on("leave-tenant", (tenantId, callback) => {
    try {
      // Validate tenant ID format
      if (!mongoose.Types.ObjectId.isValid(tenantId)) {
        return callback({
          success: false,
          message: "Invalid tenant ID format",
        });
      }

      // Check if user is in the tenant room
      if (!socket.rooms.has(`tenant-${tenantId}`)) {
        return callback({ success: false, message: "Not in tenant room" });
      }

      // Leave tenant room
      socket.leave(`tenant-${tenantId}`);

      console.log(`Socket ${socket.id} left tenant ${tenantId}`);

      callback({
        success: true,
        message: "Successfully left tenant",
        rooms: socket.rooms,
      });
    } catch (error) {
      console.error("Leave tenant error:", error);
      callback({ success: false, message: "Server error" });
    }
  });

  // **جدید**: Real-time transaction notifications
  socket.on("subscribe-transaction-updates", (tenantId, callback) => {
    try {
      // Validate tenant ID format
      if (!mongoose.Types.ObjectId.isValid(tenantId)) {
        return callback({
          success: false,
          message: "Invalid tenant ID format",
        });
      }

      // Check tenant access
      socketTenantAccess(socket, tenantId, (error, hasAccess) => {
        if (error || !hasAccess) {
          return callback({
            success: false,
            message: error?.message || "Access denied to tenant",
          });
        }

        // Join transaction updates room
        socket.join(`tenant-${tenantId}-transactions`);

        callback({
          success: true,
          message: "Subscribed to transaction updates",
        });
      });
    } catch (error) {
      console.error("Subscribe transaction updates error:", error);
      callback({ success: false, message: "Server error" });
    }
  });

  // **جدید**: Real-time rate updates
  socket.on("subscribe-rate-updates", (tenantId, callback) => {
    try {
      // Validate tenant ID format
      if (!mongoose.Types.ObjectId.isValid(tenantId)) {
        return callback({
          success: false,
          message: "Invalid tenant ID format",
        });
      }

      // Check tenant access
      socketTenantAccess(socket, tenantId, (error, hasAccess) => {
        if (error || !hasAccess) {
          return callback({
            success: false,
            message: error?.message || "Access denied to tenant",
          });
        }

        // Join rate updates room
        socket.join(`tenant-${tenantId}-rates`);

        callback({
          success: true,
          message: "Subscribed to rate updates",
        });
      });
    } catch (error) {
      console.error("Subscribe rate updates error:", error);
      callback({ success: false, message: "Server error" });
    }
  });

  // **جدید**: Send direct message to user
  socket.on("send-user-message", (data, callback) => {
    try {
      const { recipientUserId, message, tenantId } = data;

      // Validate inputs
      if (
        !mongoose.Types.ObjectId.isValid(recipientUserId) ||
        !mongoose.Types.ObjectId.isValid(tenantId)
      ) {
        return callback({
          success: false,
          message: "Invalid user or tenant ID",
        });
      }

      // Check tenant access
      socketTenantAccess(socket, tenantId, (error, hasAccess) => {
        if (error || !hasAccess) {
          return callback({
            success: false,
            message: error?.message || "Access denied to tenant",
          });
        }

        // Send message to specific user
        socket.to(`user-${recipientUserId}`).emit("user-message", {
          from: socket.user.userId,
          message,
          timestamp: new Date(),
          tenantId,
        });

        callback({ success: true, message: "Message sent" });
      });
    } catch (error) {
      console.error("Send user message error:", error);
      callback({ success: false, message: "Server error" });
    }
  });

  // Handle disconnect
  socket.on("disconnect", (reason) => {
    console.log(`Socket ${socket.id} disconnected: ${reason}`);
  });

  // **امنیت**: Handle errors
  socket.on("error", (error) => {
    console.error(`Socket ${socket.id} error:`, error);
  });
};

// **جدید**: Utility functions for broadcasting
const broadcastToTenant = (io, tenantId, event, data) => {
  io.to(`tenant-${tenantId}`).emit(event, data);
};

const broadcastToUser = (io, userId, event, data) => {
  io.to(`user-${userId}`).emit(event, data);
};

const broadcastToBranch = (io, branchId, event, data) => {
  io.to(`branch-${branchId}`).emit(event, data);
};

module.exports = {
  handleSocketEvents,
  broadcastToTenant,
  broadcastToUser,
  broadcastToBranch,
};
