import { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';

interface ErrorWithStatus extends Error {
  statusCode?: number;
}

export const errorMiddleware: ErrorRequestHandler = (error: ErrorWithStatus, _req, res, _next) => {
  if (error instanceof ZodError) {
    return res.status(400).json({
      message: error.issues[0].message,
    });
  }

  const statusCode = error.statusCode ?? 500;

  if (statusCode >= 500) {
    console.error(error);
  }

  res.status(statusCode).json({
    message: statusCode >= 500 ? 'Internal server error' : error.message,
  });
};
