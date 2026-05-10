const express = require('express');
const { authenticate } = require('../middleware/auth');
const authService = require('../services/authService');
const { success, error } = require('../utilities/responseHelper');
const { auditLog } = require('../utilities/auditHelper');
const { sendPasswordReset } = require('../utilities/emailHelper');

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
      if (result.expired) {
        await auditLog(auditDb, {
          userId: null,
          userEmail: email,
          action: 'auth.login_expired',
          entityType: 'user',
          entityId: null,
          details: {},
          ip: req.ip
        });
        return error(res, 'Account has expired', 401);
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

  router.post('/forgot-password', async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) return error(res, 'Email is required', 400);

      const rawToken = await authService.createPasswordResetToken(db, email);
      if (rawToken) {
        const frontendUrl = process.env.CORS_ORIGIN || 'http://localhost:5173';
        const resetUrl = `${frontendUrl}/reset-password?token=${rawToken}`;
        await sendPasswordReset(email, resetUrl);
        await auditLog(auditDb, {
          userId: null,
          userEmail: email,
          action: 'auth.password_reset_requested',
          entityType: 'user',
          entityId: null,
          details: {},
          ip: req.ip
        });
      }

      // Always respond the same way to avoid email enumeration
      return success(res, { message: 'If that email exists, a reset link has been sent.' });
    } catch (err) {
      return error(res, 'Failed to process request');
    }
  });

  router.post('/reset-password', async (req, res) => {
    try {
      const { token, password } = req.body;
      if (!token || !password) return error(res, 'Token and password are required', 400);
      if (password.length < 8) return error(res, 'Password must be at least 8 characters', 400);

      const ok = await authService.resetPassword(db, token, password);
      if (!ok) return error(res, 'Invalid or expired reset link', 400);

      await auditLog(auditDb, {
        userId: null,
        userEmail: null,
        action: 'auth.password_reset_completed',
        entityType: 'user',
        entityId: null,
        details: {},
        ip: req.ip
      });

      return success(res, { message: 'Password updated. You can now log in.' });
    } catch (err) {
      return error(res, 'Failed to reset password');
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

  router.put('/me/avatar', authenticate, async (req, res) => {
    try {
      const { seed } = req.body;
      await authService.updateAvatarSeed(db, req.user.id, seed || null);
      const user = await authService.getUserById(db, req.user.id);
      return success(res, { user });
    } catch (err) {
      return error(res, 'Failed to update avatar');
    }
  });

  return router;
}

module.exports = createAuthRoutes;
