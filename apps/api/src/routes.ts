import { Router } from 'express';
import { prisma } from '@crafthub/db';
import { authRouter } from './modules/auth/routes.js';
import { catalogRouter } from './modules/catalog/routes.js';
import { vendorRouter } from './modules/vendor/routes.js';
import { vendorProductsRouter } from './modules/vendor/products.js';
import { adminRouter } from './modules/admin/routes.js';

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
router.use('/api/v1', catalogRouter);
router.use('/api/v1/vendor', vendorRouter);
router.use('/api/v1/vendor/products', vendorProductsRouter);
router.use('/api/v1/admin', adminRouter);
