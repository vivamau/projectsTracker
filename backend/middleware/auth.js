const jwt = require('jsonwebtoken');
const { getOne, runQuery } = require('../config/database');

function authenticate(req, res, next) {
  const token = req.cookies && req.cookies.token;
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    if (roles.length > 0 && !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}

function createExpiryCheck(db) {
  return async (req, res, next) => {
    const token = req.cookies && req.cookies.token;
    if (!token) return next();

    let payload;
    try {
      payload = jwt.decode(token);
    } catch (_) {
      return next();
    }
    if (!payload || !payload.id) return next();

    try {
      const user = await getOne(db,
        'SELECT user_active, user_expire_date FROM users WHERE id = ? AND (user_is_deleted = 0 OR user_is_deleted IS NULL)',
        [payload.id]
      );
      if (!user) return next();

      if (user.user_expire_date && Date.now() > user.user_expire_date) {
        const now = Date.now();
        await runQuery(db,
          `UPDATE users SET user_active = 0, userrole_id = 4, user_password_hash = NULL,
           user_update_date = ? WHERE id = ?`,
          [now, payload.id]
        );
        res.clearCookie('token', { path: '/' });
        return res.status(401).json({ error: 'Account has expired' });
      }
    } catch (_) {
      // non-fatal: let the request proceed if DB check fails
    }

    next();
  };
}

module.exports = { authenticate, authorize, createExpiryCheck };
