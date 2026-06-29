import Link from 'next/link';

const STACK = ['NestJS', 'PostgreSQL', 'Redis', 'Twilio', 'Next.js', 'Stripe'];

/**
 * Phase 0 holding page. Not a placeholder template — it sets the visual
 * language for the product: ink canvas, fine line work, a single signal accent,
 * and purposeful motion (the "ring" that radiates the moment a lead lands).
 */
export default function Home() {
  return (
    <main className="relative min-h-dvh overflow-hidden bg-ink text-paper">
      {/* Fine structural grid — a precise lattice, not a decorative wash. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            'linear-gradient(to right, var(--color-line) 1px, transparent 1px), linear-gradient(to bottom, var(--color-line) 1px, transparent 1px)',
          backgroundSize: '64px 64px',
          maskImage: 'radial-gradient(circle at 50% 42%, black 0%, transparent 78%)',
        }}
      />

      {/* Top bar */}
      <header className="relative z-10 flex items-center justify-between px-6 py-6 sm:px-10">
        <div className="flex items-center gap-3">
          <Mark />
          <span className="text-sm font-semibold tracking-[0.32em] text-paper">LEADARROW</span>
        </div>
        <nav className="flex items-center gap-2">
          <Link
            href="/login"
            className="rounded-lg px-4 py-2 text-sm font-medium text-muted transition-colors hover:text-paper"
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className="rounded-lg bg-signal px-4 py-2 text-sm font-semibold text-ink transition-colors hover:bg-[#ff6a33]"
          >
            Start trial
          </Link>
        </nav>
      </header>

      {/* Hero */}
      <section className="relative z-10 mx-auto flex max-w-5xl flex-col items-center px-6 pt-20 text-center sm:pt-28">
        {/* Signal node with radiating rings */}
        <div className="relative mb-14 grid place-items-center">
          {[0, 0.65, 1.3].map((delay) => (
            <span
              key={delay}
              className="absolute size-24 rounded-full border border-signal/40"
              style={{ animation: `var(--animate-ring)`, animationDelay: `${delay}s` }}
            />
          ))}
          <span className="relative grid size-16 place-items-center rounded-full border border-signal/60 bg-ink-raised">
            <span className="size-2.5 rounded-full bg-signal shadow-[0_0_24px_4px_var(--color-signal)]" />
          </span>
        </div>

        <p
          className="mb-5 font-mono text-xs tracking-[0.4em] text-signal"
          style={{ animation: 'var(--animate-rise)' }}
        >
          SPEED&nbsp;TO&nbsp;LEAD
        </p>

        <h1
          className="text-balance text-4xl font-semibold leading-[1.05] tracking-tight sm:text-6xl"
          style={{ animation: 'var(--animate-rise)', animationDelay: '0.08s' }}
        >
          The right rep rings
          <br />
          <span className="text-muted">the instant a lead lands.</span>
        </h1>

        <p
          className="mt-6 max-w-xl text-pretty text-base leading-relaxed text-muted"
          style={{ animation: 'var(--animate-rise)', animationDelay: '0.16s' }}
        >
          A speed-to-lead engine for high-ticket sales teams — phone, browser softphone, and
          push, routed in seconds. The platform foundation is now in place.
        </p>

        {/* Arrow tracer baseline */}
        <div className="relative mt-16 h-px w-full max-w-md overflow-hidden bg-line">
          <span className="absolute inset-y-0 left-0 w-1/3 animate-tracer bg-signal" />
        </div>

        {/* Stack chips */}
        <ul className="mt-10 flex flex-wrap items-center justify-center gap-2">
          {STACK.map((tech) => (
            <li
              key={tech}
              className="rounded-md border border-line bg-ink-raised px-3 py-1.5 font-mono text-[11px] tracking-wide text-faint"
            >
              {tech}
            </li>
          ))}
        </ul>
      </section>

      {/* Footer */}
      <footer className="relative z-10 mt-24 flex items-center justify-center gap-2 pb-10 font-mono text-[11px] tracking-widest text-faint">
        <span>PHASE&nbsp;0</span>
        <span className="text-line">/</span>
        <span>MONOREPO&nbsp;SCAFFOLD</span>
      </footer>
    </main>
  );
}

/** Minimal geometric arrow mark drawn from solid strokes. */
function Mark() {
  return (
    <span className="grid size-7 place-items-center rounded-[7px] border border-line bg-ink-raised">
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
