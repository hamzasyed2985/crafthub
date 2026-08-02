import type { NextFunction, Response } from 'express';
import { prisma } from '@crafthub/db';
import { AppError } from '../lib/errors.js';
import type { AuthedRequest } from './auth.js';

export type VendorRequest = AuthedRequest & {
  vendorId?: string;
  vendorStatus?: 'pending' | 'approved' | 'suspended';
  shopId?: string;
};

/** Load vendor profile for the authed user. Allows pending for apply/onboarding routes. */
export function requireVendor(opts?: { requireApproved?: boolean }) {
  return async (req: VendorRequest, _res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new AppError(401, 'UNAUTHORIZED', 'Authentication required');
      }

      const vendor = await prisma.vendorProfile.findUnique({
        where: { userId: req.user.sub },
        include: { shop: true },
      });

      if (!vendor) {
        throw new AppError(403, 'NOT_A_VENDOR', 'Vendor profile required');
      }

      if (vendor.status === 'suspended') {
        throw new AppError(403, 'VENDOR_SUSPENDED', 'This shop is suspended');
      }

      if (opts?.requireApproved && vendor.status !== 'approved') {
        throw new AppError(403, 'VENDOR_NOT_APPROVED', 'Vendor must be approved');
      }

      req.vendorId = vendor.id;
      req.vendorStatus = vendor.status;
      req.shopId = vendor.shop?.id;
      next();
    } catch (err) {
      next(err);
    }
  };
}
