import { Request, Response } from 'express';
import { authService } from '../services/authService';
import { asyncHandler } from '../middleware/errorHandler';

export const register = asyncHandler(async (req: Request, res: Response) => {
  const { email, password, companyName } = req.body;

  const result = await authService.register(email, password, companyName);

  res.status(201).json({
    message: 'User registered successfully',
    token: result.token,
    userId: result.userId,
  });
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;

  const result = await authService.login(email, password);

  res.status(200).json({
    message: 'Login successful',
    token: result.token,
    userId: result.userId,
  });
});
