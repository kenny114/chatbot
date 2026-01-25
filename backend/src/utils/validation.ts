import { body, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';

export const validateRequest = (req: Request, res: Response, next: NextFunction): void => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() });
    return;
  }
  next();
};

export const registerValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain uppercase, lowercase, and number'),
  body('companyName')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Company name must be between 2 and 100 characters'),
  validateRequest
];

export const loginValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
  validateRequest
];

export const createChatbotValidation = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Chatbot name must be between 2 and 100 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description must not exceed 500 characters'),
  body('instructions')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Instructions must not exceed 2000 characters'),
  validateRequest
];

export const addUrlSourceValidation = [
  body('url')
    .isURL({ protocols: ['http', 'https'], require_protocol: true })
    .withMessage('Valid URL is required'),
  validateRequest
];

export const addTextSourceValidation = [
  body('content')
    .trim()
    .isLength({ min: 10, max: 100000 })
    .withMessage('Content must be between 10 and 100000 characters'),
  validateRequest
];

export const chatValidation = [
  body('message')
    .trim()
    .isLength({ min: 1, max: 1000 })
    .withMessage('Message must be between 1 and 1000 characters'),
  validateRequest
];

// SECURITY: Check if hostname is a private/internal IP address (SSRF protection)
const isPrivateIP = (hostname: string): boolean => {
  // Block localhost variations
  if (['localhost', '127.0.0.1', '0.0.0.0', '::1', '[::1]'].includes(hostname.toLowerCase())) {
    return true;
  }

  // Check for private IP ranges
  const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
  const match = hostname.match(ipv4Regex);

  if (match) {
    const [, a, b, c] = match.map(Number);
    // 10.x.x.x (Class A private)
    if (a === 10) return true;
    // 172.16.x.x - 172.31.x.x (Class B private)
    if (a === 172 && b >= 16 && b <= 31) return true;
    // 192.168.x.x (Class C private)
    if (a === 192 && b === 168) return true;
    // 169.254.x.x (Link-local)
    if (a === 169 && b === 254) return true;
    // 127.x.x.x (Loopback)
    if (a === 127) return true;
  }

  return false;
};

// URL sanitization - prevents common attacks and SSRF
export const sanitizeUrl = (url: string): string => {
  try {
    const parsed = new URL(url);

    // Only allow http and https protocols
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      throw new Error('Invalid protocol - only HTTP and HTTPS allowed');
    }

    // SECURITY: Block private/internal IPs (SSRF protection)
    if (isPrivateIP(parsed.hostname)) {
      throw new Error('URL cannot point to internal/private addresses');
    }

    // Block common cloud metadata endpoints
    if (parsed.hostname === '169.254.169.254' ||
        parsed.hostname.endsWith('.internal') ||
        parsed.hostname.endsWith('.local')) {
      throw new Error('URL cannot point to internal services');
    }

    return parsed.toString();
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Invalid URL format');
  }
};
