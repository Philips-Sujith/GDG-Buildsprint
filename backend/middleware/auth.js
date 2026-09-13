const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'smart-library-development-secret';

const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Unauthorized: Missing or invalid token', message: 'Unauthorized' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, error: 'Unauthorized: Invalid token', message: 'Unauthorized' });
  }
};

const requireAdmin = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Unauthorized: Missing or invalid token', message: 'Unauthorized' });
  }
  const token = authHeader.split(' ')[1];
  let decoded;
  try {
    decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
  } catch (err) {
    return res.status(401).json({ success: false, error: 'Unauthorized: Invalid token', message: 'Unauthorized' });
  }

  try {
    const user = await User.findOne({ regNo: decoded.regNo }).select('-passwordHash');
    if (!user) {
      return res.status(401).json({ success: false, error: 'User not found', message: 'User not found' });
    }

    if (user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: Administrator privileges required',
        message: 'Access denied: Admin role required',
      });
    }

    req.user = {
      id: user._id,
      regNo: user.regNo,
      name: user.name,
      role: user.role,
      department: user.department,
    };
    next();
  } catch (dbErr) {
    console.error('requireAdmin error:', dbErr);
    return res.status(500).json({ success: false, error: 'Authorization error', message: 'Server error' });
  }
};

authMiddleware.requireAdmin = requireAdmin;
module.exports = authMiddleware;
module.exports.authMiddleware = authMiddleware;
module.exports.requireAdmin = requireAdmin;

