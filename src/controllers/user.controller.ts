import { Request, Response } from 'express';
import * as userService from '../services/user.service';
import { SyncUserInput } from '../validators/user.validator';

/**
 * POST /api/users/sync
 * Upsert user from Clerk data. Called on first login or via Clerk webhook.
 */
export async function syncUser(req: Request, res: Response): Promise<void> {
  const { name, email, imageUrl } = req.body as SyncUserInput;
  const clerkUserId = req.auth.userId!;

  const user = await userService.syncUser({ clerkUserId, name, email, imageUrl });

  res.status(200).json({
    success: true,
    data: { user },
  });
}

/**
 * GET /api/users/me
 * Return the authenticated user's profile.
 */
export async function getMe(req: Request, res: Response): Promise<void> {
  const clerkUserId = req.auth.userId!;
  const user = await userService.getUserByClerkId(clerkUserId);

  res.status(200).json({
    success: true,
    data: { user },
  });
}
