// کنترل دسترسی مبتنی بر نقش (RBAC)
module.exports.authorize = function (allowedRoles) {
  return (req, res, next) => {
    const userRole = req.user?.role;
    if (!userRole || !allowedRoles.includes(userRole)) {
      return res
        .status(403)
        .json({ success: false, message: "دسترسی غیرمجاز" });
    }
    next();
  };
};
