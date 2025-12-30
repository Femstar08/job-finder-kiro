import jwt from 'jsonwebtoken';
import { config } from '../config';
import { UserRepository } from '../database/repositories/UserRepository';
import { CreateUserRequest, LoginRequest, AuthResponse, User } from '../types';
import { AppError } from '../middleware/errorHandler';

export class AuthService {
  private userRepository: UserRepository;

  constructor() {
    this.userRepository = new UserRepository();
  }

  async register(userData: CreateUserRequest): Promise<AuthResponse> {
    // Check if user already exists
    const existingUser = await this.userRepository.findByEmail(userData.email);
    if (existingUser) {
      throw new AppError('User with this email already exists', 409, 'EMAIL_EXISTS', 'email');
    }

    // Create new user
    const user = await this.userRepository.create(userData);

    // Generate JWT token
    const token = this.generateToken(user);

    return {
      user: this.sanitizeUser(user),
      token
    };
  }

  async login(loginData: LoginRequest): Promise<AuthResponse> {
    // Verify user credentials
    const user = await this.userRepository.findByEmail(loginData.email);

    if (!user) {
      console.log(`[AuthDebug] Login failed: User not found for email ${loginData.email}`);
      throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
    }

    const isValid = await this.userRepository.verifyPassword(loginData.email, loginData.password);

    if (!isValid) {
      throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
    }

    // Generate JWT token
    const token = this.generateToken(user);

    return {
      user: this.sanitizeUser(user),
      token
    };
  }

  async getProfile(userId: string): Promise<Omit<User, 'passwordHash'>> {
    const user = await this.userRepository.findById(userId);

    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    return this.sanitizeUser(user);
  }

  async updateProfile(
    userId: string,
    updates: Partial<Pick<User, 'firstName' | 'lastName' | 'email'>>
  ): Promise<Omit<User, 'passwordHash'>> {
    // If email is being updated, check if it's already taken
    if (updates.email) {
      const existingUser = await this.userRepository.findByEmail(updates.email);
      if (existingUser && existingUser.id !== userId) {
        throw new AppError('Email already in use', 409, 'EMAIL_EXISTS', 'email');
      }
    }

    const updatedUser = await this.userRepository.updateProfile(userId, updates);
    return this.sanitizeUser(updatedUser);
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    // Verify current password
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    const isCurrentPasswordValid = await this.userRepository.verifyPassword(user.email, currentPassword);
    if (!isCurrentPasswordValid) {
      throw new AppError('Current password is incorrect', 400, 'INVALID_CURRENT_PASSWORD');
    }

    // Update password
    await this.userRepository.updatePassword(userId, newPassword);
  }

  async deleteAccount(userId: string, password: string): Promise<void> {
    // Verify password before deletion
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    const isPasswordValid = await this.userRepository.verifyPassword(user.email, password);
    if (!isPasswordValid) {
      throw new AppError('Password is incorrect', 400, 'INVALID_PASSWORD');
    }

    // Delete user account
    await this.userRepository.delete(userId);
  }

  private generateToken(user: User): string {
    const payload = {
      userId: user.id,
      email: user.email
    };

    return jwt.sign(payload, config.jwt.secret as string, {
      expiresIn: 604800, // 7 days in seconds
      issuer: 'job-finder-api',
      audience: 'job-finder-app'
    } as jwt.SignOptions);
  }

  private sanitizeUser(user: User): Omit<User, 'passwordHash'> {
    const { passwordHash, ...sanitizedUser } = user;
    return sanitizedUser;
  }

  verifyToken(token: string): { userId: string; email: string } {
    try {
      const decoded = jwt.verify(token, config.jwt.secret) as { userId: string; email: string };
      return decoded;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new AppError('Token expired', 401, 'TOKEN_EXPIRED');
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw new AppError('Invalid token', 401, 'INVALID_TOKEN');
      }
      throw new AppError('Token verification failed', 401, 'TOKEN_VERIFICATION_FAILED');
    }
  }

  async refreshToken(token: string): Promise<{ token: string }> {
    const decoded = this.verifyToken(token);

    // Verify user still exists
    const user = await this.userRepository.findById(decoded.userId);
    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    // Generate new token
    const newToken = this.generateToken(user);

    return { token: newToken };
  }
}