import { Router } from 'express';
import { NotificationController } from '../controllers/NotificationController';
import { authenticateToken } from '../middleware/auth';
import { validateBody } from '../middleware/validation';
import { notificationSettingsSchema, testNotificationSchema } from '../validation/schemas';

const router = Router();
const notificationController = new NotificationController();

// All notification routes require authentication
router.use(authenticateToken);

// Get user notification settings
router.get('/settings', notificationController.getSettings.bind(notificationController));

// Update user notification settings
router.put(
  '/settings',
  validateBody(notificationSettingsSchema),
  notificationController.updateSettings.bind(notificationController)
);

// Send test notification
router.post(
  '/test',
  validateBody(testNotificationSchema),
  notificationController.sendTestNotification.bind(notificationController)
);

export default router;