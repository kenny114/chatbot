import { Router } from 'express';
import { register, login } from '../controllers/authController';
import { registerValidation, loginValidation } from '../utils/validation';
import { authLimiter } from '../middleware/rateLimiter';

const router = Router();

router.post('/register', authLimiter, registerValidation, register);
router.post('/login', authLimiter, loginValidation, login);

export default router;
