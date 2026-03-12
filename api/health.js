require('dotenv').config();
const {
  applySecurityHeaders,
  setCors,
  rejectIfUntrustedOrigin,
} = require('../lib/http-security');

module.exports = async (req, res) => {
  applySecurityHeaders(req, res);
  setCors(req, res, 'GET,OPTIONS');

  if (rejectIfUntrustedOrigin(req, res)) {
    return;
  }

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  res.json({
    status: 'ok',
    message: 'Server is running',
  });
};

