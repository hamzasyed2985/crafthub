import { Router } from 'express';
import { prisma } from '@crafthub/db';
import { requireAuth, requireRole } from '../../middleware/auth.js';

export const adminInboxRouter = Router();

adminInboxRouter.use(requireAuth, requireRole('admin'));

type InboxKind = 'vendor_application' | 'category_suggestion' | 'ledger_review';

type InboxItem = {
  id: string;
  kind: InboxKind;
  title: string;
  subtitle: string | null;
  href: string;
  createdAt: string;
};

/**
 * Aggregated “needs attention” queue for admins — pending seller apps,
 * craft suggestions, and ledger reviews. Not a push/read-receipt system.
 */
adminInboxRouter.get('/inbox', async (_req, res, next) => {
  try {
    const itemLimit = 8;

    const [
      pendingVendorsCount,
      pendingSuggestionsCount,
      ledgerReviewsCount,
      pendingVendors,
      pendingSuggestions,
      ledgerVendors,
    ] = await Promise.all([
      prisma.vendorProfile.count({ where: { status: 'pending' } }),
      prisma.categorySuggestion.count({ where: { status: 'pending' } }),
      prisma.vendorProfile.count({ where: { ledgerReviewRequired: true } }),
      prisma.vendorProfile.findMany({
        where: { status: 'pending' },
        select: {
          id: true,
          displayName: true,
          slug: true,
          city: true,
          createdAt: true,
          user: { select: { email: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: itemLimit,
      }),
      prisma.categorySuggestion.findMany({
        where: { status: 'pending' },
        select: {
          id: true,
          proposedName: true,
          note: true,
          createdAt: true,
          vendor: { select: { displayName: true, slug: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: itemLimit,
      }),
      prisma.vendorProfile.findMany({
        where: { ledgerReviewRequired: true },
        select: {
          id: true,
          displayName: true,
          slug: true,
          updatedAt: true,
        },
        orderBy: { updatedAt: 'desc' },
        take: itemLimit,
      }),
    ]);

    const items: InboxItem[] = [
      ...pendingVendors.map(
        (v): InboxItem => ({
          id: `vendor:${v.id}`,
          kind: 'vendor_application',
          title: `${v.displayName} applied to sell`,
          subtitle: [v.city, v.user.email].filter(Boolean).join(' · ') || null,
          href: '/admin/vendors?status=pending',
          createdAt: v.createdAt.toISOString(),
        }),
      ),
      ...pendingSuggestions.map(
        (s): InboxItem => ({
          id: `suggestion:${s.id}`,
          kind: 'category_suggestion',
          title: `Craft suggested: ${s.proposedName}`,
          subtitle: `From ${s.vendor.displayName}${s.note ? ` — ${s.note.slice(0, 80)}` : ''}`,
          href: '/admin/categories',
          createdAt: s.createdAt.toISOString(),
        }),
      ),
      ...ledgerVendors.map(
        (v): InboxItem => ({
          id: `ledger:${v.id}`,
          kind: 'ledger_review',
          title: `${v.displayName} needs ledger review`,
          subtitle: 'Outstanding refund debt or payout review',
          href: '/admin/vendors?status=approved',
          createdAt: v.updatedAt.toISOString(),
        }),
      ),
    ]
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0))
      .slice(0, 12);

    const total = pendingVendorsCount + pendingSuggestionsCount + ledgerReviewsCount;

    res.json({
      data: {
        counts: {
          pendingVendors: pendingVendorsCount,
          pendingCategorySuggestions: pendingSuggestionsCount,
          ledgerReviews: ledgerReviewsCount,
          total,
        },
        items,
      },
    });
  } catch (err) {
    next(err);
  }
});
