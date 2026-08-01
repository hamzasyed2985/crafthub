import type { NextFunction, Response } from 'express';
import { prisma } from '@crafthub/db';
import { verifyAccessToken } from '../lib/auth-tokens.js';
import type { AuthedRequest } from './auth.js';

/** Attach user when a valid token is present; never fails the request. */
export async function optionalAuth(req: AuthedRequest, _res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization;
    const bearer = header?.startsWith('Bearer ') ? header.slice('Bearer '.length).trim() : null;
    const cookie =
      typeof req.cookies?.access_token === 'string' ? req.cookies.access_token : null;
    const token = bearer || cookie;
    if (!token) {
      next();
      return;
    }

    const payload = await verifyAccessToken(token);
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (user && user.status !== 'banned') {
      req.user = { sub: user.id, email: user.email, role: user.role };
    }
  } catch {
    // ignore invalid tokens for optional auth
  }
  next();
}
