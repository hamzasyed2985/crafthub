'use client';

import { useMemo, useState } from 'react';

export type PieSlice = {
  label: string;
  value: number;
  color: string;
};

type Props = {
  slices: PieSlice[];
  size?: number;
  emptyLabel?: string;
  /** Format legend/detail values (e.g. money). Defaults to raw number. */
  formatValue?: (value: number) => string;
};

function polar(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function arcPath(cx: number, cy: number, r: number, start: number, end: number) {
  const s = polar(cx, cy, r, end);
  const e = polar(cx, cy, r, start);
  const large = end - start > 180 ? 1 : 0;
  return `M ${cx} ${cy} L ${e.x} ${e.y} A ${r} ${r} 0 ${large} 1 ${s.x} ${s.y} Z`;
}

export function SimplePieChart({
  slices,
  size = 168,
  emptyLabel = 'No data yet',
  formatValue = (v) => String(v),
}: Props) {
  const [active, setActive] = useState<number | null>(null);
  const total = useMemo(() => slices.reduce((n, s) => n + Math.max(0, s.value), 0), [slices]);
  const usable = slices.filter((s) => s.value > 0);

  if (total <= 0 || usable.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center text-sm text-subtle">{emptyLabel}</div>
    );
  }

  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 4;
  let cursor = 0;
  const arcs = usable.map((slice, i) => {
    const portion = (slice.value / total) * 360;
    const start = cursor;
    const end = cursor + portion;
    cursor = end;
    // Full circle special-case
    const path =
      portion >= 359.9
        ? `M ${cx} ${cy - r} A ${r} ${r} 0 1 1 ${cx - 0.01} ${cy - r} Z`
        : arcPath(cx, cy, r, start, end);
    return { ...slice, path, index: i };
  });

  const focus = active !== null ? arcs[active] : null;

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="shrink-0"
        role="img"
        aria-label="Distribution chart"
      >
        {arcs.map((arc, i) => (
          <path
            key={arc.label}
            d={arc.path}
            fill={arc.color}
            stroke="var(--bg-elevated)"
            strokeWidth={1.5}
            opacity={active === null || active === i ? 1 : 0.4}
            className="cursor-pointer transition-opacity"
            onMouseEnter={() => setActive(i)}
            onMouseLeave={() => setActive(null)}
            onFocus={() => setActive(i)}
            onBlur={() => setActive(null)}
            onClick={() => setActive((prev) => (prev === i ? null : i))}
            tabIndex={0}
          />
        ))}
      </svg>
      <ul className="w-full space-y-2 text-sm">
        {arcs.map((arc, i) => {
          const pct = ((arc.value / total) * 100).toFixed(0);
          const isOn = active === i;
          return (
            <li key={arc.label}>
              <button
                type="button"
                className={`flex w-full items-center justify-between gap-3 rounded-sm px-1 py-0.5 text-left ${
                  isOn ? 'bg-background-subtle' : ''
                }`}
                onMouseEnter={() => setActive(i)}
                onMouseLeave={() => setActive(null)}
                onClick={() => setActive((prev) => (prev === i ? null : i))}
              >
                <span className="flex min-w-0 items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: arc.color }}
                    aria-hidden
                  />
                  <span className="truncate text-muted">{arc.label}</span>
                </span>
                <span className="shrink-0 font-medium tabular-nums text-foreground">
                  {formatValue(arc.value)} · {pct}%
                </span>
              </button>
            </li>
          );
        })}
        {focus ? (
          <li className="pt-1 text-xs text-subtle">
            Selected: {focus.label} ({formatValue(focus.value)})
          </li>
        ) : null}
      </ul>
    </div>
  );
}
