import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import authRoutes from '../src/routes/authRoutes';
import chatbotRoutes from '../src/routes/chatbotRoutes';
import webhookRoutes from '../src/routes/webhookRoutes';
import paymentRoutes from '../src/routes/paymentRoutes';
import analyticsRoutes from '../src/routes/analyticsRoutes';
import userRoutes from '../src/routes/userRoutes';
import usageRoutes from '../src/routes/usageRoutes';
import { errorHandler } from '../src/middleware/errorHandler';
import { apiLimiter } from '../src/middleware/rateLimiter';

dotenv.config();

const app = express();

// Trust proxy for rate limiting and IP detection
app.set('trust proxy', 1);

// Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://www.paypal.com", "https://www.paypalobjects.com"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://www.paypal.com", "https://api.openai.com"],
      frameSrc: ["'self'", "https://www.paypal.com"],
      fontSrc: ["'self'", "https:", "data:"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// CORS - Allow all origins for widget embedding
app.use(cors({
  origin: '*',
  credentials: false,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Apply rate limiting to all routes
app.use('/api', apiLimiter);

// Health check
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/chatbots', chatbotRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/usage', usageRoutes);

// Error handling middleware (must be last)
app.use(errorHandler);

// Export for Vercel
export default app;
