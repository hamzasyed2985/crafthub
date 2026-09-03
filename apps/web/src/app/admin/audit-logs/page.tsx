'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ListRowSkeleton } from '@/components/list-row-skeleton';
import { Page } from '@/components/page';
import { PaginationControls } from '@/components/pagination-controls';
import { fetchAdminAuditLogs } from '@/lib/api';

type AuditLogRow = Awaited<ReturnType<typeof fetchAdminAuditLogs>>['data'][number];

const PAGE_SIZE_OPTIONS = [12, 24, 48] as const;

function actionLabel(action: string): string {
  switch (action) {
    case 'vendor.apply':
      return 'Vendor applied';
    case 'vendor.approved':
      return 'Vendor approved';
    case 'vendor.suspended':
      return 'Vendor suspended';
    case 'vendor.pending':
      return 'Vendor set to pending';
    case 'product.unpublish':
      return 'Product unpublished';
    case 'order.refund':
      return 'Order refunded';
    case 'order.cancelled':
      return 'Order cancelled';
    case 'vendor_order.fulfill':
      return 'Shipment started';
    case 'vendor_order.ship':
      return 'Shipment marked shipped';
    case 'vendor_order.deliver':
      return 'Shipment delivered';
    case 'transfer.retry':
      return 'Transfer retried';
    case 'category.create':
      return 'Category created';
    case 'category.update':
      return 'Category updated';
    case 'category_suggestion.create':
      return 'Category suggested';
    case 'category_suggestion.approved':
      return 'Category suggestion approved';
    case 'category_suggestion.rejected':
      return 'Category suggestion rejected';
    case 'settings.patch':
      return 'Settings updated';
    default:
      return action.replace(/[._]/g, ' ');
  }
}

function metaSummary(log: AuditLogRow): string | null {
  const meta = (log.meta ?? {}) as Record<string, unknown>;
  const parts: string[] = [];

  if (typeof meta.from === 'string' && typeof meta.to === 'string') {
    parts.push(`${meta.from} → ${meta.to}`);
  } else if (typeof meta.from === 'string') {
    parts.push(`was ${meta.from}`);
  }

  if (typeof meta.city === 'string' && meta.city) {
    parts.push(meta.city);
  }
  if (typeof meta.carrier === 'string' && meta.carrier) {
    parts.push(
      typeof meta.trackingNumber === 'string' && meta.trackingNumber
        ? `${meta.carrier} ${meta.trackingNumber}`
        : meta.carrier,
    );
  } else if (typeof meta.trackingNumber === 'string' && meta.trackingNumber) {
    parts.push(`Tracking ${meta.trackingNumber}`);
  }
  if (typeof meta.reason === 'string' && meta.reason) {
    parts.push(meta.reason.replace(/_/g, ' '));
  }

  return parts.length > 0 ? parts.join(' · ') : null;
}

export default function AdminAuditLogsPage() {
  const [logs, setLogs] = useState<AuditLogRow[] | null>(null);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(24);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(24);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    setPage(1);
  }, [filter]);

  useEffect(() => {
    setLogs(null);
    fetchAdminAuditLogs(filter || undefined, page, pageSize)
      .then((res) => {
        setLogs(res.data);
        setTotal(res.meta.total);
        setLimit(res.meta.limit);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed'));
  }, [filter, page, pageSize]);

  return (
    <Page size="wide">
      <h1 className="font-display text-3xl">Audit log</h1>
      <p className="mt-1 text-muted">Who did what across the marketplace</p>

      <input
        className="mt-6 w-full max-w-sm rounded-md border border-border bg-canvas px-3 py-2 text-sm"
        placeholder="Filter by action (e.g. refund, vendor, ship)"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
      />

      {error ? <p className="mt-4 text-danger">{error}</p> : null}
      {!logs ? <ListRowSkeleton rows={8} columns={1} /> : null}

      {logs && logs.length === 0 ? (
        <p className="mt-8 text-subtle">No audit entries match this filter.</p>
      ) : null}

      {logs && logs.length > 0 ? (
        <ul className="mt-8 divide-y divide-border text-sm">
          {logs.map((log) => {
            const detail = metaSummary(log);
            const subject = log.subject ?? `${log.entity} ${log.entityId.slice(0, 8)}`;
            const actor = log.actor?.name
              ? `${log.actor.name} (${log.actor.email})`
              : (log.actor?.email ?? 'system');

            return (
              <li key={log.id} className="py-3">
                <p className="font-semibold text-foreground">{actionLabel(log.action)}</p>
                <p className="mt-0.5 text-muted">
                  {log.href ? (
                    <Link href={log.href} className="text-accent hover:underline">
                      {subject}
                    </Link>
                  ) : (
                    subject
                  )}
                  {detail ? <span> · {detail}</span> : null}
                </p>
                <p className="mt-1 text-subtle">
                  {new Date(log.createdAt).toLocaleString()} · {actor}
                </p>
              </li>
            );
          })}
        </ul>
      ) : null}

      {logs ? (
        <PaginationControls
          page={page}
          limit={limit}
          total={total}
          onPageChange={setPage}
          pageSizeOptions={[...PAGE_SIZE_OPTIONS]}
          onPageSizeChange={(next) => {
            setPageSize(next);
            setPage(1);
          }}
        />
      ) : null}
    </Page>
  );
}
