import type { NextFunction, Request, Response } from 'express';
import { prisma } from '@crafthub/db';
import { AppError } from '../lib/errors.js';
import { verifyAccessToken, type AccessTokenPayload } from '../lib/auth-tokens.js';

export type AuthedRequest = Request & {
  user?: AccessTokenPayload;
};

function readBearer(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return null;
  return header.slice('Bearer '.length).trim() || null;
}

function readAccessCookie(req: Request): string | null {
  const token = req.cookies?.access_token;
  return typeof token === 'string' && token.length > 0 ? token : null;
}

export async function requireAuth(req: AuthedRequest, _res: Response, next: NextFunction) {
  try {
    const token = readBearer(req) ?? readAccessCookie(req);
    if (!token) {
      throw new AppError(401, 'UNAUTHORIZED', 'Authentication required');
    }

    const payload = await verifyAccessToken(token);
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || user.status === 'banned') {
      throw new AppError(401, 'UNAUTHORIZED', 'Invalid session');
    }

    req.user = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };
    next();
  } catch (err) {
    if (err instanceof AppError) {
      next(err);
      return;
    }
    next(new AppError(401, 'UNAUTHORIZED', 'Invalid or expired token'));
  }
}

export function requireRole(...roles: AccessTokenPayload['role'][]) {
  return (req: AuthedRequest, _res: Response, next: NextFunction) => {
    if (!req.user) {
      next(new AppError(401, 'UNAUTHORIZED', 'Authentication required'));
      return;
    }
    if (!roles.includes(req.user.role)) {
      next(new AppError(403, 'FORBIDDEN', 'Insufficient permissions'));
      return;
    }
    next();
  };
}
