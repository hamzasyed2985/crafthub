/** Shared Stripe Connect readiness for vendor UI. */
export type VendorStripeFlags = {
  chargesEnabled?: boolean;
  payoutsEnabled?: boolean;
  onboardingComplete?: boolean;
  hasAccount?: boolean;
};

/** Platform can take payment / transfer when charges are enabled and onboarding was submitted. */
export function isStripeConnected(stripe: VendorStripeFlags | null | undefined): boolean {
  return Boolean(stripe?.chargesEnabled && stripe?.onboardingComplete);
}

export function stripeStatusMessage(stripe: VendorStripeFlags | null | undefined): string {
  if (isStripeConnected(stripe)) {
    return 'Connected — buyers can check out and payouts are linked.';
  }
  if (stripe?.hasAccount) {
    return 'Setup started — finish Stripe to enable checkout.';
  }
  return 'Required before buyers can check out your items.';
}
