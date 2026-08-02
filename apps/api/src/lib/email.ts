import { prisma } from '@crafthub/db';
import { env } from '../env.js';
import { logger } from './logger.js';
import { enqueueEmailJob } from './queue.js';

export type EmailTemplate =
  | 'order.paid'
  | 'order.shipped'
  | 'order.refunded'
  | 'vendor.approved';

const SUBJECTS: Record<EmailTemplate, string> = {
  'order.paid': 'Your CraftHub order is confirmed',
  'order.shipped': 'Your CraftHub order has shipped',
  'order.refunded': 'Your CraftHub order was refunded',
  'vendor.approved': 'Your CraftHub shop was approved',
};

function renderBody(template: EmailTemplate, payload: Record<string, unknown>): string {
  const app = env.APP_URL;
  switch (template) {
    case 'order.paid':
      return [
        `Hi${payload.name ? ` ${payload.name}` : ''},`,
        '',
        `We've received payment for order ${payload.orderId}.`,
        `Total: ${payload.totalLabel ?? ''}`,
        '',
        `Track it: ${app}/account/orders/${payload.orderId}`,
        '',
        '— CraftHub',
      ].join('\n');
    case 'order.shipped':
      return [
        `Good news — a maker has shipped part of your order.`,
        '',
        `Order: ${payload.orderId}`,
        payload.trackingNumber
          ? `Tracking: ${payload.carrier ? `${payload.carrier} ` : ''}${payload.trackingNumber}`
          : 'Tracking will appear on your order page when available.',
        '',
        `View: ${app}/account/orders/${payload.orderId}`,
        '',
        '— CraftHub',
      ].join('\n');
    case 'order.refunded':
      return [
        `Your order ${payload.orderId} has been refunded.`,
        payload.reason ? `Reason: ${payload.reason}` : '',
        '',
        `Details: ${app}/account/orders/${payload.orderId}`,
        '',
        '— CraftHub',
      ].join('\n');
    case 'vendor.approved':
      return [
        `Congratulations${payload.name ? `, ${payload.name}` : ''}!`,
        '',
        `Your shop “${payload.shopName ?? 'your shop'}” is approved.`,
        `Complete Stripe onboarding and publish products: ${app}/vendor/onboarding`,
        '',
        '— CraftHub',
      ].join('\n');
    default: {
      const _exhaustive: never = template;
      return String(_exhaustive);
    }
  }
}

/** Persist + enqueue an email. Delivery is mock/log unless SMTP is configured later. */
export async function enqueueEmail(opts: {
  toEmail: string;
  template: EmailTemplate;
  payload?: Record<string, unknown>;
}) {
  const subject = SUBJECTS[opts.template];
  const row = await prisma.emailOutbox.create({
    data: {
      toEmail: opts.toEmail,
      subject,
      template: opts.template,
      payload: (opts.payload ?? {}) as object,
      status: 'pending',
    },
  });

  try {
    await enqueueEmailJob(row.id);
  } catch (err) {
    logger.warn({ err, emailId: row.id }, 'Email queue unavailable — sending inline');
    await sendEmailOutbox(row.id);
  }
  return row;
}

/** Process a single outbox row (worker or sync fallback). */
export async function sendEmailOutbox(id: string) {
  const row = await prisma.emailOutbox.findUnique({ where: { id } });
  if (!row || row.status === 'sent') return row;

  const payload = (row.payload ?? {}) as Record<string, unknown>;
  const body = renderBody(row.template as EmailTemplate, payload);

  try {
    // Mock delivery: log. Real SMTP can replace this later.
    logger.info(
      {
        emailId: row.id,
        to: row.toEmail,
        template: row.template,
        subject: row.subject,
        bodyPreview: body.slice(0, 200),
      },
      'Email sent (mock)',
    );

    return prisma.emailOutbox.update({
      where: { id: row.id },
      data: { status: 'sent', sentAt: new Date(), error: null },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'send failed';
    return prisma.emailOutbox.update({
      where: { id: row.id },
      data: { status: 'failed', error: message },
    });
  }
}
