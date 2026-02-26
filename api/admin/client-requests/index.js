const {
  resolveUserFromRequest,
  assertAuthenticated,
  listClientRequests,
  createClientRequest,
} = require('../../../lib/admin-crm');
const { setCors, parseBody, sendError } = require('../_helpers');

module.exports = async (req, res) => {
  setCors(req, res, 'GET,POST,OPTIONS');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  const payload = parseBody(req.body);

  try {
    const user = await resolveUserFromRequest(req);
    assertAuthenticated(user);

    if (req.method === 'GET') {
      const data = await listClientRequests(user);
      res.status(200).json({
        success: true,
        ...data,
      });
      return;
    }

    if (req.method === 'POST') {
      const requestRecord = await createClientRequest(payload, user);
      res.status(201).json({
        success: true,
        request: requestRecord,
        notificationSent: false,
      });
      return;
    }

    res.status(405).json({
      success: false,
      error: 'Method not allowed',
    });
  } catch (error) {
    if (/crm tables are missing/i.test(String(error?.message || ''))) {
      res.status(200).json({
        success: true,
        requests: [],
        hiredProfiles: [],
        warning: error.message,
      });
      return;
    }
    sendError(res, error);
  }
};
