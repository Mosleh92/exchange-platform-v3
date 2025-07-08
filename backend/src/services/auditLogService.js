const AuditLog = require("../models/AuditLog");

exports.logAction = async ({
  action,
  resource,
  resourceId,
  user,
  ip,
  details,
}) => {
  await AuditLog.create({
    action,
    resource,
    resourceId,
    userId: user?._id,
    username: user?.username || user?.email,
    ip,
    details,
  });
};
