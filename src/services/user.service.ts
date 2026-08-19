import { User, IUser } from '../models/User.model';
import { Subscription } from '../models/Subscription.model';
import { Errors } from '../utils/AppError';
import { logger } from '../utils/logger';

export interface SyncUserParams {
  clerkUserId: string;
  name: string;
  email: string;
  imageUrl?: string;
}

/**
 * Upsert a user record by Clerk user ID.
 * Called on first login and by the Clerk webhook on user.created / user.updated.
 */
export async function syncUser(params: SyncUserParams): Promise<IUser> {
  const { clerkUserId, name, email, imageUrl } = params;

  const user = await User.findOneAndUpdate(
    { clerkUserId },
    {
      $set: { name, email, imageUrl },
      $setOnInsert: { clerkUserId },
    },
    { upsert: true, new: true, runValidators: true },
  );

  // Create a default free subscription if one doesn't exist
  const existingSub = await Subscription.findOne({ userId: clerkUserId });
  if (!existingSub) {
    await Subscription.create({
      userId: clerkUserId,
      plan: 'free',
      status: 'active',
      provider: 'stripe',
    });
    logger.info('Created default subscription for new user', {
      operation: 'sync_user',
    });
  }

  logger.info('User synced', { operation: 'sync_user' });
  return user;
}

/**
 * Get a user by their Clerk user ID.
 * Throws 404 if user does not exist.
 */
export async function getUserByClerkId(clerkUserId: string): Promise<IUser> {
  const user = await User.findOne({ clerkUserId });
  if (!user) {
    throw Errors.notFound('User');
  }
  return user;
}
