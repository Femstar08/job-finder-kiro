import { Request, Response } from 'express';
import { AuthService } from '../services/AuthService';
import { CreateUserRequest, LoginRequest } from '../types';
import { asyncHandler } from '../middleware/errorHandler';
import { AuthenticatedRequest } from '../middleware/auth';

export class AuthController {
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService();
  }

  register = asyncHandler(async (req: Request, res: Response) => {
    const userData: CreateUserRequest = req.body;

    const result = await this.authService.register(userData);

    res.status(201).json({
      message: 'User registered successfully',
      data: result
    });
  });

  login = asyncHandler(async (req: Request, res: Response) => {
    const loginData: LoginRequest = req.body;

    const result = await this.authService.login(loginData);

    res.json({
      message: 'Login successful',
      data: result
    });
  });

  getProfile = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const profile = await this.authService.getProfile(req.user.id);

    res.json({
      message: 'Profile retrieved successfully',
      data: profile
    });
  });

  updateProfile = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const updates = req.body;
    const updatedProfile = await this.authService.updateProfile(req.user.id, updates);

    res.json({
      message: 'Profile updated successfully',
      data: updatedProfile
    });
  });

  changePassword = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const { currentPassword, newPassword } = req.body;

    await this.authService.changePassword(req.user.id, currentPassword, newPassword);

    res.json({
      message: 'Password changed successfully'
    });
  });

  refreshToken = asyncHandler(async (req: Request, res: Response) => {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        error: 'Token is required',
        code: 'MISSING_TOKEN'
      });
    }

    const result = await this.authService.refreshToken(token);

    res.json({
      message: 'Token refreshed successfully',
      data: result
    });
  });

  deleteAccount = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const { password } = req.body;

    if (!password) {
      return res.status(400).json({
        error: 'Password is required for account deletion',
        code: 'MISSING_PASSWORD'
      });
    }

    await this.authService.deleteAccount(req.user.id, password);

    res.json({
      message: 'Account deleted successfully'
    });
  });

  logout = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    // For JWT tokens, logout is handled client-side by removing the token
    // In a more complex setup, you might want to blacklist tokens in Redis

    res.json({
      message: 'Logout successful'
    });
  });
}