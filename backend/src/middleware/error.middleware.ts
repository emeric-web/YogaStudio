import { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';

interface HttpError extends Error {
  statusCode?: number;
}

export const errorMiddleware: ErrorRequestHandler = (error: HttpError, _req, res, _next) => {
  const statusCode = error.statusCode ?? 500;

  if (error instanceof ZodError) {
    return res.status(400).json({
      message: error.issues[0].message,
    });
  }

  if (statusCode >= 500) {
    console.error(error);
  }

  res.status(statusCode).json({
    message: statusCode >= 500 ? 'Internal server error' : error.message,
  });
};
