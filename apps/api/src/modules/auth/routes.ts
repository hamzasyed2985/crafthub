import { Router } from 'express';
import { prisma } from '@crafthub/db';
import { loginSchema, registerSchema } from '@crafthub/shared';
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
import { requireAuth, type AuthedRequest } from '../../middleware/auth.js';

export const authRouter = Router();

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
    const input = loginSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email: input.email.toLowerCase() } });
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
