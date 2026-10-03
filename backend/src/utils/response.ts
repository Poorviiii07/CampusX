import { Response } from 'express';

export function sendSuccess(
  res: Response,
  data: unknown,
  message = 'Success',
  statusCode = 200
): Response {
  return res.status(statusCode).json({
    success: true,
    data,
    message,
    errors: null,
  });
}

export function sendError(
  res: Response,
  message: string,
  statusCode = 400,
  errors?: unknown
): Response {
  return res.status(statusCode).json({
    success: false,
    data: null,
    message,
    errors: errors ?? null,
  });
}
