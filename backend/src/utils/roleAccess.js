// تابع کمکی برای تست یا استفاده داخلی
function hasAccess(user, roles) {
  return roles.includes(user.role);
}
// برای استفاده در routeها از middleware authorize در middleware/roleAccess.js استفاده کنید
module.exports = { hasAccess };
