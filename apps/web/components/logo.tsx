import { cn } from '../lib/cn';

/**
 * LeadArrow mark: a lead (the dot) routed along a path to the rep (the arrow).
 * Drawn from solid strokes in the signal accent, on the dark chip.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'grid size-7 place-items-center rounded-[7px] border border-line bg-ink-raised',
        className,
      )}
    >
      <svg width="62%" height="62%" viewBox="0 0 32 32" fill="none" aria-hidden>
        <circle cx="6.4" cy="16" r="2.5" fill="var(--color-signal)" />
        <path
          d="M9.2 16C12.4 16 12 9 15.5 9 19 9 19 16 22.4 16"
          stroke="var(--color-signal)"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M19.2 12.9 22.6 16 19.2 19.1"
          stroke="var(--color-signal)"
          strokeWidth="2.4"
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
