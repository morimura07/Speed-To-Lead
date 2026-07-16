import Link from 'next/link';
import { LogoMark, Wordmark } from '../components/logo';

const CALENDLY_URL = process.env.NEXT_PUBLIC_CALENDLY_URL ?? 'https://calendly.com';

const STEPS = [
  { n: '01', title: 'A lead lands', body: 'A new prospect enters your CRM or a Slack channel. LeadArrow catches it in milliseconds.' },
  { n: '02', title: 'Everything rings', body: 'The right rep is rung at once — mobile, browser softphone, and push — based on your routing rules.' },
  { n: '03', title: 'Press 1, connected', body: 'They accept and get the CRM record instantly. Decline or miss, and it cascades to the next rep.' },
];

const FEATURES = [
  { title: 'CRM & Slack ingestion', body: 'Close, GoHighLevel, Salesforce, HubSpot, and Slack channels — normalized into one live feed.' },
  { title: 'Simultaneous ring', body: 'Phone, Chrome softphone, and Pushover fire together. First accept wins; the rest cancel.' },
  { title: 'Smart routing', body: 'Round-robin or percentage allocation, with on-call, availability, and calendar checks.' },
  { title: 'Speed analytics', body: 'Time-to-first-alert, pickup rates, routing health, and reliability — with drill-down.' },
  { title: 'Availability & calendar', body: 'Working hours, days off, timezones, and an optional calendar busy-check per rep.' },
  { title: 'Booking alerts & reminders', body: 'Confirm bookings from Slack and get called about follow-up tasks at the right time.' },
];

export default function Home() {
  return (
    <main className="relative min-h-dvh overflow-hidden bg-ink text-paper">
      <GridBackdrop />

      <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <Wordmark />
        <nav className="flex items-center gap-2">
          <Link href="/login" className="rounded-lg px-4 py-2 text-sm font-medium text-muted transition-colors hover:text-paper">
            Sign in
          </Link>
          <Link href="/signup" className="rounded-lg bg-signal px-4 py-2 text-sm font-semibold text-ink transition-colors hover:bg-[#ff6a33]">
            Start trial
          </Link>
        </nav>
      </header>

      {/* Hero */}
      <section className="relative z-10 mx-auto max-w-3xl px-6 pt-16 pb-10 text-center sm:pt-24">
        <SignalNode />
        <p className="mb-5 font-mono text-xs tracking-[0.4em] text-signal" style={{ animation: 'var(--animate-rise)' }}>
          SPEED&nbsp;TO&nbsp;LEAD
        </p>
        <h1 className="text-balance text-4xl font-semibold leading-[1.05] tracking-tight sm:text-6xl" style={{ animation: 'var(--animate-rise)', animationDelay: '0.08s' }}>
          The right rep rings the
          <br />
          instant a lead lands.
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-pretty text-base leading-relaxed text-muted sm:text-lg" style={{ animation: 'var(--animate-rise)', animationDelay: '0.16s' }}>
          A speed-to-lead engine for high-ticket sales teams. Connect reps to prospects in seconds —
          across phone, browser, and push — before the competition even hits send.
        </p>
        <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row" style={{ animation: 'var(--animate-rise)', animationDelay: '0.24s' }}>
          <Link href="/signup" className="inline-flex h-12 items-center justify-center rounded-xl bg-signal px-6 text-sm font-semibold text-ink transition-colors hover:bg-[#ff6a33]">
            Start your 30-day trial
          </Link>
          <a href={CALENDLY_URL} target="_blank" rel="noreferrer" className="inline-flex h-12 items-center justify-center rounded-xl border border-line bg-ink-raised px-6 text-sm font-medium text-paper transition-colors hover:border-faint">
            Book a consultation
          </a>
        </div>
      </section>

      {/* How it works */}
      <section className="relative z-10 mx-auto max-w-5xl px-6 py-20">
        <SectionLabel>HOW IT WORKS</SectionLabel>
        <div className="mt-8 grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-3">
          {STEPS.map((s) => (
            <div key={s.n} className="bg-ink-raised p-7">
              <span className="font-mono text-xs tracking-widest text-signal">{s.n}</span>
              <h3 className="mt-3 text-lg font-semibold text-paper">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="relative z-10 mx-auto max-w-6xl px-6 py-20">
        <SectionLabel>THE PLATFORM</SectionLabel>
        <h2 className="mt-4 max-w-2xl text-balance text-3xl font-semibold tracking-tight">
          Everything between a lead and a live conversation.
        </h2>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="group relative overflow-hidden rounded-2xl border border-line bg-ink-raised p-6 transition-colors hover:border-faint">
              <div className="mb-4 grid size-9 place-items-center rounded-lg border border-line bg-ink">
                <span className="size-2 rounded-full bg-signal" />
              </div>
              <h3 className="text-base font-semibold text-paper">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section className="relative z-10 mx-auto max-w-3xl px-6 py-20">
        <SectionLabel>PRICING</SectionLabel>
        <div className="mt-8 overflow-hidden rounded-3xl border border-line bg-ink-raised">
          <div className="border-b border-line p-8 text-center sm:p-10">
            <p className="font-mono text-xs tracking-widest text-muted">PLANS START AT</p>
            <p className="mt-3 text-5xl font-semibold tracking-tight">
              $750<span className="text-xl font-normal text-muted">/month</span>
            </p>
            <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-muted">
              Final pricing depends on rep count, CRM, lead volume, phone/SMS usage, geography, and
              onboarding. We&apos;ll scope it with you on a quick call.
            </p>
            <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <a href={CALENDLY_URL} target="_blank" rel="noreferrer" className="inline-flex h-11 items-center justify-center rounded-xl bg-signal px-6 text-sm font-semibold text-ink transition-colors hover:bg-[#ff6a33]">
                Book a consultation
              </a>
              <Link href="/signup" className="inline-flex h-11 items-center justify-center rounded-xl border border-line bg-ink px-6 text-sm font-medium text-paper transition-colors hover:border-faint">
                Start a free trial
              </Link>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4">
            {['Starter', 'Growth', 'Scale', 'Enterprise'].map((tier) => (
              <div key={tier} className="border-r border-line p-4 text-center last:border-r-0">
                <p className="text-sm font-medium text-paper">{tier}</p>
                <p className="mt-1 font-mono text-[10px] tracking-widest text-faint">SOON</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 mx-auto max-w-4xl px-6 py-20 text-center">
        <h2 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
          Stop losing leads to slow follow-up.
        </h2>
        <p className="mx-auto mt-4 max-w-lg text-muted">
          Set it up in an afternoon. Your reps ring the moment a lead is worth calling.
        </p>
        <Link href="/signup" className="mt-8 inline-flex h-12 items-center justify-center rounded-xl bg-signal px-7 text-sm font-semibold text-ink transition-colors hover:bg-[#ff6a33]">
          Start your 30-day trial
        </Link>
      </section>

      <footer className="relative z-10 border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 sm:flex-row">
          <Wordmark />
          <p className="font-mono text-[11px] tracking-widest text-faint">© LEADARROW</p>
          <div className="flex gap-4 text-sm text-muted">
            <Link href="/privacy" className="hover:text-paper">Privacy</Link>
            <Link href="/terms" className="hover:text-paper">Terms</Link>
            <Link href="/login" className="hover:text-paper">Sign in</Link>
            <Link href="/signup" className="hover:text-paper">Start trial</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}

function SignalNode() {
  return (
    <div className="relative mx-auto mb-12 grid size-16 place-items-center">
      {[0, 0.65, 1.3].map((delay) => (
        <span key={delay} className="absolute size-16 rounded-full border border-signal/40" style={{ animation: 'var(--animate-ring)', animationDelay: `${delay}s` }} />
      ))}
      <span className="relative grid size-14 place-items-center rounded-2xl border border-signal/60 bg-ink-raised">
        <LogoMark className="size-9 rounded-xl" />
      </span>
    </div>
  );
}

function GridBackdrop() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 opacity-[0.3]"
      style={{
        backgroundImage:
          'linear-gradient(to right, var(--color-line) 1px, transparent 1px), linear-gradient(to bottom, var(--color-line) 1px, transparent 1px)',
        backgroundSize: '64px 64px',
        maskImage: 'radial-gradient(ellipse 80% 50% at 50% 0%, black 0%, transparent 70%)',
      }}
    />
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <span className="h-px w-8 bg-signal" />
      <span className="font-mono text-xs tracking-[0.35em] text-signal">{children}</span>
    </div>
  );
}
