import { Router } from 'express';
import { prisma } from '@crafthub/db';
import { authRouter } from './modules/auth/routes.js';
import { catalogRouter } from './modules/catalog/routes.js';
import { vendorRouter } from './modules/vendor/routes.js';
import { vendorProductsRouter } from './modules/vendor/products.js';
import { vendorStripeRouter } from './modules/vendor/stripe.js';
import { vendorOrdersRouter } from './modules/vendor/orders.js';
import { vendorEarningsRouter } from './modules/vendor/earnings.js';
import { vendorDashboardRouter } from './modules/vendor/dashboard.js';
import { adminRouter } from './modules/admin/routes.js';
import { adminFinanceRouter } from './modules/admin/finance.js';
import { cartRouter } from './modules/cart/routes.js';
import { checkoutRouter } from './modules/checkout/routes.js';
import { ordersRouter } from './modules/orders/routes.js';

export const router = Router();

router.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

router.get('/ready', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ready' });
  } catch {
    res.status(503).json({ status: 'not_ready' });
  }
});

router.use('/api/v1/auth', authRouter);
router.use('/api/v1/cart', cartRouter);
router.use('/api/v1/checkout', checkoutRouter);
router.use('/api/v1/orders', ordersRouter);
router.use('/api/v1', catalogRouter);
router.use('/api/v1/vendor', vendorRouter);
router.use('/api/v1/vendor/products', vendorProductsRouter);
router.use('/api/v1/vendor/stripe', vendorStripeRouter);
router.use('/api/v1/vendor/orders', vendorOrdersRouter);
router.use('/api/v1/vendor/earnings', vendorEarningsRouter);
router.use('/api/v1/vendor/dashboard', vendorDashboardRouter);
router.use('/api/v1/admin', adminRouter);
router.use('/api/v1/admin', adminFinanceRouter);
