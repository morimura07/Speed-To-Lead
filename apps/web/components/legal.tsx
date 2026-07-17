import Link from 'next/link';
import { Wordmark } from './logo';

/** Shared chrome for legal pages (privacy, terms). */
export function LegalShell({
  title,
  effective,
  updated,
  children,
}: {
  title: string;
  effective: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-dvh bg-ink text-paper">
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-6">
          <Link href="/">
            <Wordmark />
          </Link>
          <Link href="/" className="text-sm text-muted hover:text-paper">
            ← Back
          </Link>
        </div>
      </header>

      <article className="mx-auto max-w-3xl px-6 py-14">
        <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-3 font-mono text-xs tracking-widest text-faint">
          EFFECTIVE {effective} · LAST UPDATED {updated}
        </p>
        <div className="mt-10 space-y-8">{children}</div>
      </article>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-8 text-sm text-muted">
          <span className="font-mono text-[11px] tracking-widest text-faint">© LEADARROW</span>
          <div className="flex gap-4">
            <Link href="/privacy" className="hover:text-paper">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-paper">
              Terms
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}

/** Leading text block before the first numbered section. */
export function Intro({ children }: { children: React.ReactNode }) {
  return <div className="space-y-3 text-sm leading-relaxed text-muted">{children}</div>;
}

/** Top-level numbered section (## heading). */
export function Section({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold text-paper">{heading}</h2>
      <div className="space-y-4 text-sm leading-relaxed text-muted">{children}</div>
    </section>
  );
}

/** Nested subsection (### heading). */
export function SubSection({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h3 className="text-sm font-semibold text-paper">{heading}</h3>
      <div className="space-y-3 text-sm leading-relaxed text-muted">{children}</div>
    </section>
  );
}

/** Bulleted list. */
export function Bullets({ children }: { children: React.ReactNode }) {
  return <ul className="list-disc space-y-1.5 pl-5 marker:text-faint">{children}</ul>;
}

/** Ordered list. */
export function Numbers({ children }: { children: React.ReactNode }) {
  return <ol className="list-decimal space-y-1.5 pl-5 marker:text-faint">{children}</ol>;
}

/** Inline mailto link, brand-styled. */
export function Mail({ address }: { address: string }) {
  return (
    <a href={`mailto:${address}`} className="text-signal hover:underline">
      {address}
    </a>
  );
}
