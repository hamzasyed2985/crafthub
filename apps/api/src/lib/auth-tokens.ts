import { createHash, randomBytes, randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';
import { env } from '../env.js';

const secret = new TextEncoder().encode(env.JWT_SECRET);

export type AccessTokenPayload = {
  sub: string;
  email: string;
  role: 'customer' | 'vendor' | 'admin';
};

function parseDurationToSeconds(value: string): number {
  const match = /^(\d+)([smhd])$/.exec(value);
  if (!match?.[1] || !match[2]) return 900;
  const amount = Number(match[1]);
  const unit = match[2] as 's' | 'm' | 'h' | 'd';
  switch (unit) {
    case 's':
      return amount;
    case 'm':
      return amount * 60;
    case 'h':
      return amount * 60 * 60;
    case 'd':
      return amount * 60 * 60 * 24;
    default: {
      const _exhaustive: never = unit;
      return _exhaustive;
    }
  }
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function signAccessToken(payload: AccessTokenPayload): Promise<string> {
  // jti makes each issue unique even when claims + iat second are identical (fast refresh).
  return new SignJWT({ email: payload.email, role: payload.role })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(payload.sub)
    .setJti(randomUUID())
    .setIssuedAt()
    .setExpirationTime(env.JWT_ACCESS_TTL)
    .sign(secret);
}

export async function verifyAccessToken(token: string): Promise<AccessTokenPayload> {
  const { payload } = await jwtVerify(token, secret);
  if (!payload.sub || typeof payload.email !== 'string' || typeof payload.role !== 'string') {
    throw new Error('Invalid token payload');
  }
  return {
    sub: payload.sub,
    email: payload.email,
    role: payload.role as AccessTokenPayload['role'],
  };
}

export function createRefreshToken(): { raw: string; hash: string; expiresAt: Date } {
  const raw = randomBytes(48).toString('base64url');
  const hash = hashToken(raw);
  const expiresAt = new Date(Date.now() + parseDurationToSeconds(env.JWT_REFRESH_TTL) * 1000);
  return { raw, hash, expiresAt };
}

export function hashToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}
