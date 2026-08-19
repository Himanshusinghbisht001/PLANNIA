import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { asyncHandler } from '../utils/asyncHandler';
import * as subscriptionController from '../controllers/subscription.controller';

const router = Router();

/**
 * GET /api/subscriptions/me
 * Get the current user's subscription status.
 */
router.get(
  '/me',
  authMiddleware,
  asyncHandler(subscriptionController.getMySubscription),
);

/**
 * POST /api/subscriptions/checkout
 * Create a Stripe Checkout session URL.
 */
router.post(
  '/checkout',
  authMiddleware,
  asyncHandler(subscriptionController.createCheckout),
);

/**
 * POST /api/subscriptions/portal
 * Create a Stripe Billing Portal session URL.
 */
router.post(
  '/portal',
  authMiddleware,
  asyncHandler(subscriptionController.createPortal),
);

export default router;
