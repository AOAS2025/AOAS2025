const {
  resolveUserFromRequest,
  assertAuthenticated,
  finalizeClientRequest,
} = require('../../../../lib/admin-crm');
const { setCors, parseBody, sendError } = require('../../_helpers');

function resolveRequestId(req) {
  const raw = req.query?.id;
  if (Array.isArray(raw)) {
    return String(raw[0] || '').trim();
  }
  return String(raw || '').trim();
}

module.exports = async (req, res) => {
  setCors(req, res, 'POST,OPTIONS');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({
      success: false,
      error: 'Method not allowed',
    });
    return;
  }

  const payload = parseBody(req.body);

  try {
    const user = await resolveUserFromRequest(req);
    assertAuthenticated(user);

    const requestId = resolveRequestId(req);
    if (!requestId) {
      res.status(400).json({
        success: false,
        error: 'request id is required.',
      });
      return;
    }

    const result = await finalizeClientRequest(requestId, payload, user);
    res.status(200).json({
      success: true,
      request: result.request,
      hiredProfiles: result.hiredProfiles || [],
      notificationSent: false,
    });
  } catch (error) {
    sendError(res, error);
  }
};
