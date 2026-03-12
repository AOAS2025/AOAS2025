const path = require('path');

const DEFAULT_ALLOW_HEADERS = 'Content-Type, Authorization, X-Admin-Token';
const SENSITIVE_CACHE_CONTROL = 'no-store, max-age=0, must-revalidate';
const API_CSP = [
  "default-src 'none'",
  "base-uri 'none'",
  "frame-ancestors 'none'",
  "form-action 'none'",
].join('; ');
const PRIVATE_PAGE_CSP = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "connect-src 'self'",
  "font-src 'self' data:",
].join('; ');
const PUBLIC_PAGE_CSP = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "script-src 'self' 'unsafe-inline'",
  "script-src-elem 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "style-src-elem 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://*.tile.openstreetmap.org https://server.arcgisonline.com",
  "connect-src 'self' https://router.project-osrm.org",
  "font-src 'self' data:",
].join('; ');

function allowedOrigins() {
  return new Set(
    String(process.env.CORS_ALLOWED_ORIGINS || '')
      .split(',')
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean),
  );
}

function getRequestPathname(req) {
  if (typeof req.path === 'string' && req.path.trim()) {
    return req.path;
  }

  const raw = String(req.originalUrl || req.url || '/');
  const pathname = raw.split('?')[0].trim() || '/';
  return pathname.startsWith('/') ? pathname : `/${pathname}`;
}

function getRequestHost(req) {
  return String(req.headers?.['x-forwarded-host'] || req.headers?.host || '')
    .split(',')[0]
    .trim()
    .toLowerCase();
}

function isAllowedOrigin(req, originRaw) {
  if (!originRaw) {
    return true;
  }

  try {
    const origin = new URL(originRaw);
    const requestHost = getRequestHost(req);
    if (requestHost && origin.host.toLowerCase() === requestHost) {
      return true;
    }
    return allowedOrigins().has(origin.origin.toLowerCase());
  } catch {
    return false;
  }
}

function setCors(req, res, methods, headers = DEFAULT_ALLOW_HEADERS) {
  const origin = req.headers.origin;
  res.setHeader('Vary', 'Origin');
  if (origin && isAllowedOrigin(req, origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', methods || 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', headers);
  res.setHeader('Access-Control-Max-Age', '86400');
}

function writeJson(res, status, payload) {
  if (typeof res.status === 'function' && typeof res.json === 'function') {
    res.status(status).json(payload);
    return;
  }

  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(payload));
}

function rejectIfUntrustedOrigin(req, res, message = 'Origin not allowed.') {
  const origin = req.headers.origin;
  if (origin && !isAllowedOrigin(req, origin)) {
    writeJson(res, 403, {
      success: false,
      error: message,
    });
    return true;
  }
  return false;
}

function isSensitivePath(pathname) {
  return pathname === '/admin'
    || pathname === '/admin.html'
    || pathname === '/insights'
    || pathname === '/insights.html'
    || pathname === '/api/metrics'
    || pathname.startsWith('/api/admin');
}

function isPrivatePage(pathname) {
  return pathname === '/admin'
    || pathname === '/admin.html'
    || pathname === '/insights'
    || pathname === '/insights.html';
}

function isPageRequest(pathname) {
  if (pathname.startsWith('/api/')) {
    return false;
  }

  const extension = path.extname(pathname).toLowerCase();
  return extension === '' || extension === '.html';
}

function setNoStore(res) {
  res.setHeader('Cache-Control', SENSITIVE_CACHE_CONTROL);
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
}

function buildContentSecurityPolicy(pathname) {
  if (pathname.startsWith('/api/')) {
    return API_CSP;
  }

  if (isPrivatePage(pathname)) {
    return PRIVATE_PAGE_CSP;
  }

  if (isPageRequest(pathname)) {
    return PUBLIC_PAGE_CSP;
  }

  return '';
}

function applySecurityHeaders(req, res) {
  const pathname = getRequestPathname(req);

  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), payment=(), usb=(), browsing-topics=(), geolocation=(self)');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');

  if (isSensitivePath(pathname)) {
    setNoStore(res);
  }

  const csp = buildContentSecurityPolicy(pathname);
  if (csp) {
    res.setHeader('Content-Security-Policy', csp);
  }
}

module.exports = {
  API_CSP,
  DEFAULT_ALLOW_HEADERS,
  PRIVATE_PAGE_CSP,
  PUBLIC_PAGE_CSP,
  applySecurityHeaders,
  buildContentSecurityPolicy,
  getRequestPathname,
  isAllowedOrigin,
  rejectIfUntrustedOrigin,
  setCors,
  setNoStore,
  writeJson,
};
