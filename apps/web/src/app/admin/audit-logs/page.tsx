'use client';

import { useEffect, useState } from 'react';
import { Page } from '@/components/page';
import { fetchAdminAuditLogs } from '@/lib/api';

export default function AdminAuditLogsPage() {
  const [logs, setLogs] = useState<Awaited<ReturnType<typeof fetchAdminAuditLogs>> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    fetchAdminAuditLogs(filter || undefined)
      .then(setLogs)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed'));
  }, [filter]);

  return (
    <Page size="default">
      <h1 className="font-display text-3xl">Audit log</h1>
      <p className="mt-1 text-muted">Recent admin actions</p>

      <input
        className="mt-6 w-full max-w-sm rounded-md border border-border bg-canvas px-3 py-2 text-sm"
        placeholder="Filter by action (e.g. refund)"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
      />

      {error ? <p className="mt-4 text-danger">{error}</p> : null}
      {!logs ? <p className="mt-8 text-subtle">Loading…</p> : null}

      {logs ? (
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
    </Page>
  );
}
