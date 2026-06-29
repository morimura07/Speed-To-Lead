import { cn } from '../lib/cn';

/** LeadArrow geometric arrow mark, drawn from solid strokes. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'grid size-7 place-items-center rounded-[7px] border border-line bg-ink-raised',
        className,
      )}
    >
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
        <path
          d="M2 12L12 2M12 2H5M12 2V9"
          stroke="var(--color-signal)"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <LogoMark />
      <span className="text-sm font-semibold tracking-[0.32em] text-paper">LEADARROW</span>
    </div>
  );
}
