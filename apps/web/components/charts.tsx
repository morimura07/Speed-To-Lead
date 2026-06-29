import { cn } from '../lib/cn';

/** A thin ring showing a single percentage — used for rates. */
export function Donut({
  value,
  label,
  sublabel,
  color = 'var(--color-signal)',
}: {
  value: number;
  label: string;
  sublabel?: string;
  color?: string;
}) {
  const r = 34;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - Math.min(100, Math.max(0, value)) / 100);
  return (
    <div className="flex items-center gap-4">
      <div className="relative size-[88px] shrink-0">
        <svg viewBox="0 0 88 88" className="-rotate-90">
          <circle cx="44" cy="44" r={r} fill="none" stroke="var(--color-line)" strokeWidth="6" />
          <circle
            cx="44"
            cy="44"
            r={r}
            fill="none"
            stroke={color}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 700ms var(--ease-out-expo)' }}
          />
        </svg>
        <div className="absolute inset-0 grid place-items-center">
          <span className="text-lg font-semibold tabular-nums text-paper">{value}%</span>
        </div>
      </div>
      <div>
        <p className="text-sm font-medium text-paper">{label}</p>
        {sublabel && <p className="mt-0.5 text-xs text-muted">{sublabel}</p>}
      </div>
    </div>
  );
}

/** Horizontal labelled bars. */
export function BarList({
  items,
  color = 'var(--color-signal)',
}: {
  items: { label: string; value: number; hint?: string }[];
  color?: string;
}) {
  const max = Math.max(1, ...items.map((i) => i.value));
  if (items.length === 0) return <EmptyChart />;
  return (
    <div className="space-y-3">
      {items.map((it) => (
        <div key={it.label}>
          <div className="mb-1 flex items-baseline justify-between text-sm">
            <span className="truncate text-muted capitalize">{it.label}</span>
            <span className="ml-2 shrink-0 font-mono tabular-nums text-paper">
              {it.value}
              {it.hint && <span className="ml-1.5 text-faint">{it.hint}</span>}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-ink">
            <div
              className="h-full rounded-full"
              style={{
                width: `${(it.value / max) * 100}%`,
                backgroundColor: color,
                transition: 'width 700ms var(--ease-out-expo)',
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Vertical columns for a daily time series (received as track, accepted as fill). */
export function ColumnChart({
  items,
}: {
  items: { day: string; received: number; accepted: number }[];
}) {
  const max = Math.max(1, ...items.map((i) => i.received));
  if (items.length === 0) return <EmptyChart />;
  return (
    <div className="flex h-40 items-end gap-1.5">
      {items.map((it) => (
        <div key={it.day} className="group relative flex flex-1 flex-col items-center gap-2">
          <div className="relative flex h-32 w-full max-w-8 items-end justify-center">
            <div
              className="absolute bottom-0 w-full rounded-t bg-ink-raised"
              style={{ height: `${(it.received / max) * 100}%` }}
            />
            <div
              className="absolute bottom-0 w-full rounded-t bg-signal"
              style={{
                height: `${(it.accepted / max) * 100}%`,
                transition: 'height 700ms var(--ease-out-expo)',
              }}
            />
            <div className="pointer-events-none absolute -top-9 z-10 hidden whitespace-nowrap rounded-md border border-line bg-ink px-2 py-1 text-[11px] text-paper group-hover:block">
              {it.accepted}/{it.received}
            </div>
          </div>
          <span className="font-mono text-[9px] text-faint">{it.day.slice(5)}</span>
        </div>
      ))}
    </div>
  );
}

export function StatTile({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string | number;
  hint?: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-line bg-ink-raised p-5">
      <p className="font-mono text-[10px] tracking-widest text-faint uppercase">{label}</p>
      <p
        className={cn(
          'mt-2 text-2xl font-semibold tabular-nums',
          accent ? 'text-signal' : 'text-paper',
        )}
      >
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}

function EmptyChart() {
  return (
    <div className="grid h-24 place-items-center text-sm text-faint">No data in this range</div>
  );
}
