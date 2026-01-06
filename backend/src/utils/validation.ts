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

// URL sanitization - prevents common attacks
export const sanitizeUrl = (url: string): string => {
  try {
    const parsed = new URL(url);
    // Only allow http and https protocols
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      throw new Error('Invalid protocol');
    }
    return parsed.toString();
  } catch (error) {
    throw new Error('Invalid URL format');
  }
};
