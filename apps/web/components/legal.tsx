import Link from 'next/link';
import { Wordmark } from './logo';

/** Shared chrome for legal pages (privacy, terms). */
export function LegalShell({
  title,
  updated,
  children,
}: {
  title: string;
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
        <p className="mt-2 font-mono text-xs tracking-widest text-faint">LAST UPDATED · {updated}</p>
        <div className="mt-4 rounded-lg border border-line bg-ink-raised p-4 text-sm text-muted">
          This is a starting template. Have it reviewed by legal counsel before launch.
        </div>
        <div className="mt-8 space-y-8">{children}</div>
      </article>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-8 text-sm text-muted">
          <span className="font-mono text-[11px] tracking-widest text-faint">© LEADARROW</span>
          <div className="flex gap-4">
            <Link href="/privacy" className="hover:text-paper">Privacy</Link>
            <Link href="/terms" className="hover:text-paper">Terms</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}

export function Section({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-lg font-semibold text-paper">{heading}</h2>
      <div className="mt-2 space-y-3 text-sm leading-relaxed text-muted">{children}</div>
    </section>
  );
}
