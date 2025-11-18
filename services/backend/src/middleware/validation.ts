import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

/**
 * Incident submission schema
 */
const IncidentSubmissionSchema = z.object({
  text: z.string().min(10, 'Text must be at least 10 characters').max(5000),
  incident_type: z
    .enum(['harassment', 'accident', 'cyber', 'infrastructure', 'medical', 'other', 'auto'])
    .optional(),
  image_urls: z.array(z.string().url()).max(5).optional(),
  audio_urls: z.array(z.string().url()).max(2).optional(),
  video_urls: z.array(z.string().url()).max(1).optional(),
  reporter_wallet: z.string().regex(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/, 'Invalid Solana address'),
});

/**
 * Validate incident submission
 */
export const validateIncidentSubmission = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    IncidentSubmissionSchema.parse(req.body);
    next();
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        })),
      });
    }
    next(error);
  }
};

/**
 * Generic validation middleware factory
 */
export function validate(schema: z.ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse(req.body);
      next();
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Validation failed',
          details: error.errors,
        });
      }
      next(error);
    }
  };
}
