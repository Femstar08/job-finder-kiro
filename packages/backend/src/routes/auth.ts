import { Router } from 'express';
import { AuthController } from '../controllers/AuthController';
import { validateBody } from '../middleware/validation';
import { authenticateToken } from '../middleware/auth';
import { authLimiter, passwordResetLimiter } from '../middleware/rateLimiter';
import {
  createUserSchema,
  loginSchema,
  updateNotificationSettingsSchema
} from '../validation/schemas';
import Joi from 'joi';

const router = Router();
const authController = new AuthController();

// Validation schemas for auth-specific endpoints
const updateProfileSchema = Joi.object({
  firstName: Joi.string().max(100).optional(),
  lastName: Joi.string().max(100).optional(),
  email: Joi.string().email().optional(),
});

const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: Joi.string().min(8).required(),
});

const refreshTokenSchema = Joi.object({
  token: Joi.string().required(),
});

const deleteAccountSchema = Joi.object({
  password: Joi.string().required(),
});

// Public routes (with rate limiting)
router.post('/register',
  authLimiter,
  validateBody(createUserSchema),
  authController.register
);

router.post('/login',
  authLimiter,
  validateBody(loginSchema),
  authController.login
);

router.post('/refresh-token',
  authLimiter,
  validateBody(refreshTokenSchema),
  authController.refreshToken
);

// Protected routes (require authentication)
router.get('/profile',
  authenticateToken,
  authController.getProfile
);

router.put('/profile',
  authenticateToken,
  validateBody(updateProfileSchema),
  authController.updateProfile
);

router.post('/change-password',
  authenticateToken,
  passwordResetLimiter,
  validateBody(changePasswordSchema),
  authController.changePassword
);

router.post('/logout',
  authenticateToken,
  authController.logout
);

router.delete('/account',
  authenticateToken,
  passwordResetLimiter,
  validateBody(deleteAccountSchema),
  authController.deleteAccount
);

export default router;