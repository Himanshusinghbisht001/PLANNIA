/**
 * Custom application error class.
 *
 * Use this instead of raw Error objects so the global error middleware
 * can produce consistent, structured JSON responses.
 *
 * @example
 *   throw new AppError('Trip not found', 404, 'TRIP_NOT_FOUND');
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  /**
   * Operational errors are predictable (validation failures, not-found etc.)
   * and should be sent to the client as structured responses.
   * Non-operational errors (bugs) should be logged and masked.
   */
  public readonly isOperational: boolean;

  constructor(
    message: string,
    statusCode = 500,
    code = 'INTERNAL_SERVER_ERROR',
    isOperational = true,
  ) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;

    // Maintain proper stack trace (Node.js)
    Error.captureStackTrace(this, this.constructor);
  }
}

/** Common error factory helpers */
export const Errors = {
  notFound: (resource: string) =>
    new AppError(`${resource} not found`, 404, `${resource.toUpperCase().replace(/\s/g, '_')}_NOT_FOUND`),

  forbidden: (message = 'Access denied') =>
    new AppError(message, 403, 'FORBIDDEN'),

  unauthorized: (message = 'Authentication required') =>
    new AppError(message, 401, 'UNAUTHORIZED'),

  badRequest: (message: string, code = 'BAD_REQUEST') =>
    new AppError(message, 400, code),

  tooManyRequests: () =>
    new AppError('Too many requests. Please try again later.', 429, 'RATE_LIMITED'),

  aiGenerationFailed: () =>
    new AppError(
      "We couldn't generate your trip right now. Please try again.",
      503,
      'TRIP_GENERATION_FAILED',
    ),
};
