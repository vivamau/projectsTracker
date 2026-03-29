const jwt = require('jsonwebtoken');

const TEST_SECRET = 'test-jwt-secret';

function generateToken(payload) {
  return jwt.sign(payload, TEST_SECRET, { expiresIn: '1h' });
}

function superadminToken() {
  return generateToken({ id: 1, email: 'superadmin@test.com', role: 'superadmin' });
}

function adminToken() {
  return generateToken({ id: 2, email: 'admin@test.com', role: 'admin' });
}

function readerToken() {
  return generateToken({ id: 3, email: 'reader@test.com', role: 'reader' });
}

function guestToken() {
  return generateToken({ id: 4, email: 'guest@test.com', role: 'guest' });
}

module.exports = { TEST_SECRET, generateToken, superadminToken, adminToken, readerToken, guestToken };
