import { Router } from 'express';
import { prisma } from '@crafthub/db';
import { AppError } from '../../lib/errors.js';
import { getStripe, isStripeMockMode } from '../../lib/stripe.js';
import { env } from '../../env.js';
import { requireAuth } from '../../middleware/auth.js';
import { requireVendor, type VendorRequest } from '../../middleware/vendor.js';

export const vendorStripeRouter = Router();

vendorStripeRouter.use(requireAuth, requireVendor({ requireApproved: true }));

function serializeStripeRow(row: {
  stripeAccountId: string | null;
  onboardingComplete: boolean;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
}) {
  return {
    accountId: row.stripeAccountId,
    onboardingComplete: row.onboardingComplete,
    chargesEnabled: row.chargesEnabled,
    payoutsEnabled: row.payoutsEnabled,
    mock: isStripeMockMode(),
  };
}

/** GET /vendor/stripe/status — Connect flags for the current vendor. */
vendorStripeRouter.get('/status', async (req: VendorRequest, res, next) => {
  try {
    const row = await prisma.stripeAccount.findUniqueOrThrow({
      where: { vendorId: req.vendorId },
    });

    if (row.stripeAccountId && !isStripeMockMode()) {
      const stripe = getStripe();
      const remote = await stripe.retrieveAccount(row.stripeAccountId);
      const updated = await prisma.stripeAccount.update({
        where: { vendorId: req.vendorId },
        data: {
          chargesEnabled: remote.charges_enabled,
          payoutsEnabled: remote.payouts_enabled,
          onboardingComplete: remote.details_submitted,
        },
      });
      res.json({ data: serializeStripeRow(updated) });
      return;
    }

    res.json({ data: serializeStripeRow(row) });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /vendor/stripe/onboard — create Express account (if needed) + Account Link URL.
 * In mock mode, immediately marks charges/payouts enabled after link creation.
 */
vendorStripeRouter.post('/onboard', async (req: VendorRequest, res, next) => {
  try {
    const vendor = await prisma.vendorProfile.findUniqueOrThrow({
      where: { id: req.vendorId },
      include: { stripeAccount: true, user: true },
    });
    if (!vendor.stripeAccount) {
      throw new AppError(400, 'NO_STRIPE_ROW', 'Stripe account record missing');
    }

    const stripe = getStripe();
    let accountId = vendor.stripeAccount.stripeAccountId;
    if (!accountId) {
      const created = await stripe.createExpressAccount({
        email: vendor.user.email,
        businessName: vendor.displayName,
      });
      accountId = created.id;
      await prisma.stripeAccount.update({
        where: { vendorId: vendor.id },
        data: { stripeAccountId: accountId },
      });
    }

    const returnUrl = `${env.APP_URL}/vendor/onboarding?stripe=return`;
    const refreshUrl = `${env.APP_URL}/vendor/onboarding?stripe=refresh`;
    const link = await stripe.createAccountLink({
      accountId,
      returnUrl,
      refreshUrl,
    });

    if (isStripeMockMode()) {
      await prisma.stripeAccount.update({
        where: { vendorId: vendor.id },
        data: {
          chargesEnabled: true,
          payoutsEnabled: true,
          onboardingComplete: true,
        },
      });
    }

    const row = await prisma.stripeAccount.findUniqueOrThrow({
      where: { vendorId: vendor.id },
    });

    res.json({
      data: {
        url: link.url,
        stripe: serializeStripeRow(row),
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /vendor/stripe/refresh — after return from Stripe, sync account flags.
 * Mock mode re-asserts enabled flags.
 */
vendorStripeRouter.post('/refresh', async (req: VendorRequest, res, next) => {
  try {
    const row = await prisma.stripeAccount.findUniqueOrThrow({
      where: { vendorId: req.vendorId },
    });
    if (!row.stripeAccountId) {
      throw new AppError(400, 'NOT_ONBOARDED', 'Start onboarding first');
    }

    const stripe = getStripe();
    const remote = await stripe.retrieveAccount(row.stripeAccountId);
    const updated = await prisma.stripeAccount.update({
      where: { vendorId: req.vendorId },
      data: {
        chargesEnabled: remote.charges_enabled,
        payoutsEnabled: remote.payouts_enabled,
        onboardingComplete: remote.details_submitted,
      },
    });

    res.json({ data: serializeStripeRow(updated) });
  } catch (err) {
    next(err);
  }
});
