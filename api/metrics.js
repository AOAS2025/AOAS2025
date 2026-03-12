const { readJsonLines, buildMetricsFromRecords } = require('../lib/inquiry-utils');
const {
  resolveUserFromRequest,
  assertAdmin,
} = require('../lib/admin-crm');
const {
  applySecurityHeaders,
  rejectIfUntrustedOrigin,
  setCors,
} = require('../lib/http-security');

function getSafeErrorMessage(error) {
  const status = Number.isInteger(error?.status) ? error.status : 500;
  if (typeof error?.publicMessage === 'string' && error.publicMessage.trim()) {
    return error.publicMessage;
  }
  if (status >= 500) {
    return 'Failed to load metrics.';
  }
  return error?.message || 'Failed to load metrics.';
}

module.exports = async (req, res) => {
  applySecurityHeaders(req, res);
  setCors(req, res, 'GET,OPTIONS');

  if (rejectIfUntrustedOrigin(req, res)) {
    return;
  }

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  if (req.method !== 'GET') {
    res.status(405).json({
      success: false,
      error: 'Method not allowed',
    });
    return;
  }

  try {
    const user = await resolveUserFromRequest(req);
    assertAdmin(user);

    const [inquiries, events] = await Promise.all([
      readJsonLines('inquiries.jsonl'),
      readJsonLines('events.jsonl'),
    ]);

    const metrics = buildMetricsFromRecords(inquiries, events);

    res.status(200).json({
      success: true,
      metrics,
    });
  } catch (error) {
    const status = Number.isInteger(error?.status) ? error.status : 500;
    if (status >= 500) {
      console.error('Metrics API error:', error?.stack || error?.message || error);
    }
    res.status(status).json({
      success: false,
      error: getSafeErrorMessage(error),
    });
  }
};
