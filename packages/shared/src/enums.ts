export const ROLES = ['customer', 'vendor', 'admin'] as const;
export type Role = (typeof ROLES)[number];

export const USER_STATUSES = ['active', 'banned'] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

export const COMMISSION_BPS_DEFAULT = 1000;
