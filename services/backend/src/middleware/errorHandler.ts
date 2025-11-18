import { Request, Response, NextFunction } from 'express';

/**
 * Global error handler
 */
export const errorHandler = (
  error: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error('[ERROR]', error);

  // Known operational errors
  if (error.message?.includes('Insufficient credits')) {
    return res.status(402).json({
      error: 'Payment Required',
      message: error.message,
    });
  }

  if (error.message?.includes('not found')) {
    return res.status(404).json({
      error: 'Not Found',
      message: error.message,
    });
  }

  // Default error
  res.status(error.status || 500).json({
    error: error.name || 'Internal Server Error',
    message: error.message || 'An unexpected error occurred',
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
  });
};

/**
 * 404 handler
 */
export const notFoundHandler = (req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`,
  });
};
