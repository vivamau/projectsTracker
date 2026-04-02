const express = require('express');
const { authenticate } = require('../middleware/auth');
const authService = require('../services/authService');
const { success, error } = require('../utilities/responseHelper');
const { auditLog } = require('../utilities/auditHelper');

function createAuthRoutes(db, auditDb) {
  const router = express.Router();

  router.post('/login', async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return error(res, 'Email and password are required', 400);
      }

      const result = await authService.login(db, email, password);
      if (!result) {
        await auditLog(auditDb, {
          userId: null,
          userEmail: email,
          action: 'auth.login_failed',
          entityType: 'user',
          entityId: null,
          details: {},
          ip: req.ip
        });
        return error(res, 'Invalid email or password', 401);
      }

      res.cookie('token', result.token, {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 2 * 60 * 60 * 1000,
        path: '/'
      });

      await auditLog(auditDb, {
        userId: result.user.id,
        userEmail: result.user.email,
        action: 'auth.login',
        entityType: 'user',
        entityId: result.user.id,
        details: {},
        ip: req.ip
      });

      return success(res, { user: result.user });
    } catch (err) {
      return error(res, 'Login failed');
    }
  });

  router.post('/logout', authenticate, async (req, res) => {
    res.clearCookie('token', { path: '/' });
    await auditLog(auditDb, {
      userId: req.user.id,
      userEmail: req.user.email,
      action: 'auth.logout',
      entityType: 'user',
      entityId: req.user.id,
      details: {},
      ip: req.ip
    });
    return success(res, { message: 'Logged out' });
  });

  router.get('/me', authenticate, async (req, res) => {
    try {
      const user = await authService.getUserById(db, req.user.id);
      if (!user) {
        return error(res, 'User not found', 404);
      }
      return success(res, { user });
    } catch (err) {
      return error(res, 'Failed to get user info');
    }
  });

  return router;
}

module.exports = createAuthRoutes;
