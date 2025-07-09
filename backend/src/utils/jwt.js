const jwt = require('jsonwebtoken');

exports.generateToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      username: user.username,
      role: user.role,
      tenant: user.tenant,
      branch: user.branch
    },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
};

exports.verifyToken = (token) => {
  return jwt.verify(token, process.env.JWT_SECRET);
};
