import jwt from 'jsonwebtoken';

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is required to run auth-protected routes.');
  }

  return secret;
}

export function assertAuthConfig() {
  getJwtSecret();
}

export function signAccessToken(payload) {
  const secret = getJwtSecret();
  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';

  return jwt.sign(payload, secret, { expiresIn });
}

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ message: 'Missing or invalid authorization token' });
  }

  try {
    const secret = getJwtSecret();
    const decoded = jwt.verify(token, secret);
    req.auth = decoded;
    return next();
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}

export function requireAnyRole(...allowedRoles) {
  return (req, res, next) => {
    const userRoles = req.auth?.roles || [];
    const hasRole = allowedRoles.some((role) => userRoles.includes(role));

    if (!hasRole) {
      return res.status(403).json({ message: 'Sorry, your current role doesn\'t allow access to this feature' });
    }

    return next();
  };
}
