import Link from 'next/link';
import { LogoMark, Wordmark } from './logo';

/**
 * Two-pane auth layout: a geometric brand canvas on the left (purposeful motion,
 * fine line work, single accent — no decorative gradients) and the form on the
 * right. Collapses to a single column on small screens.
 */
export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <main className="grid min-h-dvh grid-cols-1 bg-ink lg:grid-cols-2">
      <BrandPane />

      <section className="flex flex-col px-6 py-8 sm:px-10">
        <div className="lg:hidden">
          <Link href="/">
            <Wordmark />
          </Link>
        </div>

        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-sm py-10">
            <h1 className="text-2xl font-semibold tracking-tight text-paper">{title}</h1>
            {subtitle && <p className="mt-2 text-sm text-muted">{subtitle}</p>}
            <div className="mt-8">{children}</div>
            {footer && <div className="mt-6 text-sm text-muted">{footer}</div>}
          </div>
        </div>
      </section>
    </main>
  );
}

function BrandPane() {
  return (
    <aside className="relative hidden overflow-hidden border-r border-line bg-ink lg:block">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            'linear-gradient(to right, var(--color-line) 1px, transparent 1px), linear-gradient(to bottom, var(--color-line) 1px, transparent 1px)',
          backgroundSize: '56px 56px',
          maskImage: 'radial-gradient(circle at 38% 42%, black 0%, transparent 75%)',
        }}
      />

      <div className="relative z-10 flex h-full flex-col justify-between p-12">
        <Link href="/" className="w-fit">
          <Wordmark />
        </Link>

        {/* Signal node with radiating rings */}
        <div className="relative grid place-items-center py-10">
          {[0, 0.65, 1.3].map((delay) => (
            <span
              key={delay}
              className="absolute size-28 rounded-full border border-signal/40"
              style={{ animation: 'var(--animate-ring)', animationDelay: `${delay}s` }}
            />
          ))}
          <span className="relative grid size-20 place-items-center rounded-full border border-signal/60 bg-ink-raised">
            <LogoMark className="size-10 rounded-xl" />
          </span>
        </div>

        <div className="max-w-sm">
          <p className="mb-3 font-mono text-xs tracking-[0.4em] text-signal">SPEED&nbsp;TO&nbsp;LEAD</p>
          <p className="text-balance text-xl font-medium leading-snug text-paper">
            The right rep rings the instant a lead lands.
          </p>
          <div className="mt-6 h-px w-40 overflow-hidden bg-line">
            <span className="block h-full w-1/3 animate-tracer bg-signal" />
          </div>
        </div>
      </div>
    </aside>
  );
}
