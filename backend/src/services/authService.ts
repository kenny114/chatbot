import bcrypt from 'bcryptjs';
import { supabaseAdmin } from '../config/database';
import { generateToken } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

export class AuthService {
  /**
   * Registers a new user
   */
  async register(email: string, password: string, companyName: string): Promise<{ token: string; userId: string }> {
    try {
      // Check if user already exists
      const { data: existingUser } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('email', email)
        .single();

      if (existingUser) {
        throw new AppError('User with this email already exists', 400);
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, 10);

      // Create user
      const { data: user, error } = await supabaseAdmin
        .from('users')
        .insert({
          email,
          password_hash: passwordHash,
          company_name: companyName,
        })
        .select('id')
        .single();

      if (error || !user) {
        throw new AppError('Failed to create user', 500);
      }

      // Generate JWT token
      const token = generateToken(user.id);

      return {
        token,
        userId: user.id,
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      console.error('Registration error:', error);
      throw new AppError('Registration failed', 500);
    }
  }

  /**
   * Authenticates a user
   */
  async login(email: string, password: string): Promise<{ token: string; userId: string }> {
    try {
      // Find user
      const { data: user, error } = await supabaseAdmin
        .from('users')
        .select('id, password_hash')
        .eq('email', email)
        .single();

      if (error || !user) {
        throw new AppError('Invalid email or password', 401);
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.password_hash);

      if (!isPasswordValid) {
        throw new AppError('Invalid email or password', 401);
      }

      // Generate JWT token
      const token = generateToken(user.id);

      return {
        token,
        userId: user.id,
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      console.error('Login error:', error);
      throw new AppError('Login failed', 500);
    }
  }
}

export const authService = new AuthService();
