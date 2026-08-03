import { randomBytes } from 'node:crypto';
import { Router } from 'express';
import { prisma } from '@crafthub/db';
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
} from '@crafthub/shared';
import { env } from '../../env.js';
import { AppError } from '../../lib/errors.js';
import {
  createRefreshToken,
  hashPassword,
  hashToken,
  signAccessToken,
  verifyPassword,
} from '../../lib/auth-tokens.js';
import { clearAuthCookies, setAuthCookies } from '../../lib/cookies.js';
import { mergeGuestCartIntoUser, readCartSessionId } from '../../lib/cart.js';
import { enqueueEmail } from '../../lib/email.js';
import { checkRateLimit, clientIp } from '../../lib/rate-limit.js';
import { requireAuth, type AuthedRequest } from '../../middleware/auth.js';

export const authRouter = Router();

const RESET_TTL_MS = 60 * 60 * 1000;

function publicUser(user: {
  id: string;
  email: string;
  name: string | null;
  role: 'customer' | 'vendor' | 'admin';
  status: 'active' | 'banned';
  createdAt: Date;
}) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    status: user.status,
    createdAt: user.createdAt.toISOString(),
  };
}

function assertAuthRateLimit(req: { headers: Record<string, unknown>; socket?: { remoteAddress?: string } }, scope: string) {
  const limit = checkRateLimit(
    `auth:${scope}:${clientIp(req)}`,
    env.AUTH_RATE_LIMIT_PER_MIN,
  );
  if (!limit.ok) {
    throw new AppError(429, 'RATE_LIMITED', `Too many requests. Retry in ${limit.retryAfterSec}s`);
  }
}

async function issueSession(user: {
  id: string;
  email: string;
  role: 'customer' | 'vendor' | 'admin';
}) {
  const accessToken = await signAccessToken({
    sub: user.id,
    email: user.email,
    role: user.role,
  });
  const refresh = createRefreshToken();
  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: refresh.hash,
      expiresAt: refresh.expiresAt,
    },
  });
  return { accessToken, refreshToken: refresh.raw };
}

authRouter.post('/register', async (req, res, next) => {
  try {
    assertAuthRateLimit(req, 'register');
    const input = registerSchema.parse(req.body);
    const existing = await prisma.user.findUnique({ where: { email: input.email.toLowerCase() } });
    if (existing) {
      throw new AppError(409, 'EMAIL_TAKEN', 'An account with this email already exists');
    }

    const passwordHash = await hashPassword(input.password);
    const user = await prisma.user.create({
      data: {
        email: input.email.toLowerCase(),
        passwordHash,
        name: input.name,
        role: 'customer',
      },
    });

    const tokens = await issueSession(user);
    setAuthCookies(res, tokens);

    const guestSession = readCartSessionId(req.cookies, req.headers as Record<string, unknown>);
    await mergeGuestCartIntoUser({ userId: user.id, guestSessionId: guestSession });

    res.status(201).json({
      data: {
        user: publicUser(user),
        accessToken: tokens.accessToken,
      },
    });
  } catch (err) {
    next(err);
  }
});

authRouter.post('/login', async (req, res, next) => {
  try {
    assertAuthRateLimit(req, 'login');
    const input = loginSchema.parse(req.body);
    const emailKey = input.email.toLowerCase();
    const emailLimit = checkRateLimit(
      `auth:login-email:${emailKey}`,
      Math.max(5, Math.floor(env.AUTH_RATE_LIMIT_PER_MIN / 2)),
    );
    if (!emailLimit.ok) {
      throw new AppError(
        429,
        'RATE_LIMITED',
        `Too many requests. Retry in ${emailLimit.retryAfterSec}s`,
      );
    }

    const user = await prisma.user.findUnique({ where: { email: emailKey } });
    if (!user) {
      throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
    }
    if (user.status === 'banned') {
      throw new AppError(403, 'BANNED', 'This account has been banned');
    }

    const ok = await verifyPassword(input.password, user.passwordHash);
    if (!ok) {
      throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
    }

    const tokens = await issueSession(user);
    setAuthCookies(res, tokens);

    const guestSession = readCartSessionId(req.cookies, req.headers as Record<string, unknown>);
    await mergeGuestCartIntoUser({ userId: user.id, guestSessionId: guestSession });

    res.json({
      data: {
        user: publicUser(user),
        accessToken: tokens.accessToken,
      },
    });
  } catch (err) {
    next(err);
  }
});

/** Rotate refresh cookie → new access + refresh. Old refresh is revoked. */
authRouter.post('/refresh', async (req, res, next) => {
  try {
    assertAuthRateLimit(req, 'refresh');
    const rawRefresh = req.cookies?.refresh_token as string | undefined;
    if (!rawRefresh) {
      throw new AppError(401, 'UNAUTHORIZED', 'Missing refresh token');
    }

    const existing = await prisma.refreshToken.findUnique({
      where: { tokenHash: hashToken(rawRefresh) },
      include: { user: true },
    });

    if (!existing || existing.revokedAt || existing.expiresAt < new Date()) {
      clearAuthCookies(res);
      throw new AppError(401, 'UNAUTHORIZED', 'Invalid or expired refresh token');
    }

    if (existing.user.status === 'banned') {
      clearAuthCookies(res);
      throw new AppError(403, 'BANNED', 'This account has been banned');
    }

    await prisma.refreshToken.update({
      where: { id: existing.id },
      data: { revokedAt: new Date() },
    });

    const tokens = await issueSession(existing.user);
    setAuthCookies(res, tokens);

    res.json({
      data: {
        user: publicUser(existing.user),
        accessToken: tokens.accessToken,
      },
    });
  } catch (err) {
    next(err);
  }
});

authRouter.post('/forgot-password', async (req, res, next) => {
  try {
    assertAuthRateLimit(req, 'forgot');
    const input = forgotPasswordSchema.parse(req.body);
    const email = input.email.toLowerCase();

    const user = await prisma.user.findUnique({ where: { email } });
    if (user && user.status === 'active') {
      const raw = randomBytes(32).toString('base64url');
      await prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash: hashToken(raw),
          expiresAt: new Date(Date.now() + RESET_TTL_MS),
        },
      });

      const resetUrl = `${env.APP_URL}/reset-password?token=${encodeURIComponent(raw)}`;
      await enqueueEmail({
        toEmail: user.email,
        template: 'auth.password_reset',
        payload: {
          name: user.name,
          resetUrl,
        },
      });
    }

    // Same response whether or not the email exists (no enumeration).
    res.json({
      data: {
        ok: true,
        message: 'If that email is registered, you will receive reset instructions shortly.',
      },
    });
  } catch (err) {
    next(err);
  }
});

authRouter.post('/reset-password', async (req, res, next) => {
  try {
    assertAuthRateLimit(req, 'reset');
    const input = resetPasswordSchema.parse(req.body);
    const row = await prisma.passwordResetToken.findUnique({
      where: { tokenHash: hashToken(input.token) },
      include: { user: true },
    });

    if (!row || row.usedAt || row.expiresAt < new Date()) {
      throw new AppError(400, 'INVALID_RESET_TOKEN', 'This reset link is invalid or has expired');
    }

    if (row.user.status === 'banned') {
      throw new AppError(403, 'BANNED', 'This account has been banned');
    }

    const passwordHash = await hashPassword(input.password);
    await prisma.$transaction([
      prisma.user.update({
        where: { id: row.userId },
        data: { passwordHash },
      }),
      prisma.passwordResetToken.update({
        where: { id: row.id },
        data: { usedAt: new Date() },
      }),
      prisma.refreshToken.updateMany({
        where: { userId: row.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);

    clearAuthCookies(res);
    res.json({ data: { ok: true } });
  } catch (err) {
    next(err);
  }
});

authRouter.post('/logout', requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const rawRefresh = req.cookies?.refresh_token as string | undefined;
    if (rawRefresh) {
      await prisma.refreshToken.updateMany({
        where: { tokenHash: hashToken(rawRefresh), revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }
    clearAuthCookies(res);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

authRouter.get('/me', requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const user = await prisma.user.findUniqueOrThrow({
      where: { id: req.user!.sub },
      include: {
        vendorProfile: {
          include: { shop: true, stripeAccount: true },
        },
      },
    });

    res.json({
      data: {
        user: publicUser(user),
        vendor: user.vendorProfile
          ? {
              id: user.vendorProfile.id,
              displayName: user.vendorProfile.displayName,
              slug: user.vendorProfile.slug,
              status: user.vendorProfile.status,
              city: user.vendorProfile.city,
            }
          : null,
      },
    });
  } catch (err) {
    next(err);
  }
});
