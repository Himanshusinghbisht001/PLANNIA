import { Request, Response, NextFunction, RequestHandler } from 'express';
import { ZodSchema, ZodError } from 'zod';

type ValidationTarget = 'body' | 'params' | 'query';

/**
 * Zod validation middleware factory.
 *
 * Returns an Express middleware that validates the specified part of the request
 * against the given Zod schema.
 *
 * On success: replaces req[target] with the parsed (and coerced) data.
 * On failure: returns 400 with structured Zod error details.
 *
 * @example
 *   router.post('/trips', validate(createTripSchema), tripController.createTrip)
 *   router.get('/trips/:tripId', validate(tripParamsSchema, 'params'), ...)
 */
export function validate(
  schema: ZodSchema,
  target: ValidationTarget = 'body',
): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[target]);

    if (!result.success) {
      const errors = formatZodErrors(result.error);
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request data.',
          details: errors,
        },
      });
      return;
    }

    // Replace with parsed data (includes defaults and transformations)
    (req as unknown as Record<string, unknown>)[target] = result.data;
    next();
  };
}

function formatZodErrors(error: ZodError): Record<string, string> {
  return error.issues.reduce<Record<string, string>>((acc, issue) => {
    const path = issue.path.join('.') || 'root';
    acc[path] = issue.message;
    return acc;
  }, {});
}
