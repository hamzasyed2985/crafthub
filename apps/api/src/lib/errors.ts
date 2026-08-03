import type { NextFunction, Request, Response } from 'express';
import type { ApiErrorBody } from '@crafthub/shared';
import type { RequestWithId } from '../middleware/request-id.js';

export class AppError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function sendError(
  res: Response,
  status: number,
  code: string,
  message: string,
  details?: unknown,
  requestId?: string,
) {
  const body: ApiErrorBody = {
    error: { code, message, details },
    ...(requestId ? { requestId } : {}),
  };
  res.status(status).json(body);
}

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  const requestId = (req as RequestWithId).requestId;
  if (err instanceof AppError) {
    sendError(res, err.status, err.code, err.message, err.details, requestId);
    return;
  }

  console.error(err);
  sendError(res, 500, 'INTERNAL_ERROR', 'Something went wrong', undefined, requestId);
}
