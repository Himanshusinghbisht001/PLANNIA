import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { syncUserSchema } from '../validators/user.validator';
import { asyncHandler } from '../utils/asyncHandler';
import * as userController from '../controllers/user.controller';

const router = Router();

/**
 * POST /api/users/sync
 * Upsert the authenticated user in our database.
 * Called on first login from the frontend.
 */
router.post(
  '/sync',
  authMiddleware,
  validate(syncUserSchema),
  asyncHandler(userController.syncUser),
);

/**
 * GET /api/users/me
 * Get the authenticated user's profile.
 */
router.get(
  '/me',
  authMiddleware,
  asyncHandler(userController.getMe),
);

export default router;
