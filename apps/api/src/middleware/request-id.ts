import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

export type RequestWithId = Request & { requestId?: string };

export function requestIdMiddleware(req: Request, res: Response, next: NextFunction) {
  const incoming = req.header('x-request-id')?.trim();
  const id =
    incoming && incoming.length > 0 && incoming.length <= 128 ? incoming : randomUUID();
  (req as RequestWithId).requestId = id;
  res.setHeader('X-Request-Id', id);
  next();
}
