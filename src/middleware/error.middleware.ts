import { Request, Response, NextFunction } from 'express';
import { Error as MongooseError } from 'mongoose';
import { AppError } from '../utils/AppError';
import { logger } from '../utils/logger';
import { env } from '../config/env';

/**
 * Global Express error handler.
 *
 * Must be registered LAST (after all routes) with 4 parameters.
 * Converts all errors into consistent JSON responses.
 *
 * Security rules applied:
 * - Stack traces are hidden in production.
 * - Internal error messages are masked for non-operational errors.
 * - Mongoose CastError (bad ObjectId) → 400.
 * - Mongoose ValidationError → 400 with field errors.
 * - AppError → uses its statusCode and code.
 * - Unknown errors → 500 with masked message.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorMiddleware(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  // Log the error (but never log secrets)
  if (err instanceof AppError && err.isOperational) {
    logger.warn('Operational error', {
      code: err.code,
      message: err.message,
      statusCode: err.statusCode,
      path: req.path,
      method: req.method,
    });
  } else {
    logger.error('Unexpected error', {
      message: err instanceof Error ? err.message : 'Unknown error',
      path: req.path,
      method: req.method,
      // Never log stack in production — it may contain internal details
      ...(env.NODE_ENV !== 'production' && {
        stack: err instanceof Error ? err.stack : undefined,
      }),
    });
  }

  // --- Mongoose CastError (e.g. invalid ObjectId format) ---
  if (err instanceof MongooseError.CastError) {
    res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_ID',
        message: `Invalid ${err.path}: ${err.value}`,
      },
    });
    return;
  }

  // --- Mongoose ValidationError ---
  if (err instanceof MongooseError.ValidationError) {
    const details = Object.values(err.errors).reduce<Record<string, string>>(
      (acc, e) => {
        acc[e.path] = e.message;
        return acc;
      },
      {},
    );
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Database validation failed.',
        details,
      },
    });
    return;
  }

  // --- Mongoose duplicate key error ---
  if (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code: number }).code === 11000
  ) {
    res.status(409).json({
      success: false,
      error: {
        code: 'DUPLICATE_RESOURCE',
        message: 'A resource with that value already exists.',
      },
    });
    return;
  }

  // --- Clerk authentication error ---
  if (
    err instanceof Error &&
    err.message.toLowerCase().includes('unauthorized')
  ) {
    res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required.',
      },
    });
    return;
  }

  // --- Operational AppError ---
  if (err instanceof AppError && err.isOperational) {
    res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
      },
    });
    return;
  }

  // --- Unknown / non-operational error ---
  // Never expose internal details in production
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message:
        env.NODE_ENV === 'production'
          ? 'An unexpected error occurred. Please try again.'
          : (err instanceof Error ? err.message : 'Unknown error'),
    },
  });
}
