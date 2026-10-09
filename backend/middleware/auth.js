
const jwt = require('jsonwebtoken');

const getJwtSecret = () => {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
  if (process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'development') {
    return 'local-development-only-secret';
  }
  throw new Error('JWT_SECRET environment variable is required in production.');
};

const protect = (req, res, next) => {
  let token;
  let jwtSecret;

  try {
    jwtSecret = getJwtSecret();
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.query && req.query.token) {
    token = req.query.token;
  }

  if (token) {
    try {
      const decoded = jwt.verify(token, jwtSecret);
      req.user = decoded;
      return next();
    } catch (error) {
      return res.status(401).json({ message: 'Not authorized, token failed or expired' });
    }
  }

  return res.status(401).json({ message: 'Not authorized, no token provided' });
};

const admin = (req, res, next) => {
  if (req.user && req.user.role === 'Admin') {
    return next();
  } else {
    return res.status(403).json({ message: 'Administrative clearance required' });
  }
};

const privileged = (req, res, next) => {
  if (req.user && (req.user.role === 'Admin' || req.user.role === 'Staff')) {
    return next();
  } else {
    return res.status(403).json({ message: 'Privileged institutional access required' });
  }
};

module.exports = { protect, admin, privileged };
