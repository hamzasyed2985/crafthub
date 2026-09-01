'use client';

import { useEffect, useState } from 'react';
import { Page } from '@/components/page';
import { PaginationControls } from '@/components/pagination-controls';
import { fetchAdminAuditLogs } from '@/lib/api';

export default function AdminAuditLogsPage() {
  const [logs, setLogs] = useState<
    Awaited<ReturnType<typeof fetchAdminAuditLogs>>['data'] | null
  >(null);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(24);
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    setPage(1);
  }, [filter]);

  useEffect(() => {
    setLogs(null);
    fetchAdminAuditLogs(filter || undefined, page, 24)
      .then((res) => {
        setLogs(res.data);
        setTotal(res.meta.total);
        setLimit(res.meta.limit);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed'));
  }, [filter, page]);

  return (
    <Page size="default">
      <h1 className="font-display text-3xl">Audit log</h1>
      <p className="mt-1 text-muted">Admin and system actions</p>

      <input
        className="mt-6 w-full max-w-sm rounded-md border border-border bg-canvas px-3 py-2 text-sm"
        placeholder="Filter by action (e.g. refund)"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
      />

      {error ? <p className="mt-4 text-danger">{error}</p> : null}
      {!logs ? <p className="mt-8 text-subtle">Loading…</p> : null}

      {logs && logs.length === 0 ? (
        <p className="mt-8 text-subtle">No audit entries match this filter.</p>
      ) : null}

      {logs && logs.length > 0 ? (
        <ul className="mt-8 divide-y divide-border text-sm">
          {logs.map((log) => (
            <li key={log.id} className="py-3">
              <p className="font-semibold">
                {log.action} · {log.entity}/{log.entityId.slice(0, 8)}
              </p>
              <p className="text-subtle">
                {new Date(log.createdAt).toLocaleString()} · {log.actor?.email ?? 'system'}
              </p>
            </li>
          ))}
        </ul>
      ) : null}

      {logs ? (
        <PaginationControls page={page} limit={limit} total={total} onPageChange={setPage} />
      ) : null}
    </Page>
  );
}
