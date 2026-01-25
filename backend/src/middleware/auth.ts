import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// SECURITY: JWT_SECRET must be set in environment - no fallback in production
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('CRITICAL: JWT_SECRET environment variable must be set in production');
  }
  console.warn('WARNING: JWT_SECRET not set - using insecure default for development only');
}
const SECRET_KEY = JWT_SECRET || 'dev-only-secret-do-not-use-in-production';

export interface AuthRequest extends Request {
  userId?: string;
}

export const authenticateToken = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    res.status(401).json({ error: 'Access token required' });
    return;
  }

  try {
    const decoded = jwt.verify(token, SECRET_KEY) as { userId: string };
    req.userId = decoded.userId;
    next();
  } catch (error) {
    res.status(403).json({ error: 'Invalid or expired token' });
  }
};

export const generateToken = (userId: string): string => {
  return jwt.sign({ userId }, SECRET_KEY, { expiresIn: '24h' }); // Reduced from 7d to 24h for security
};
