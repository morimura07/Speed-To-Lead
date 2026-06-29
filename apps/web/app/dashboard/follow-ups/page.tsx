'use client';

import { useEffect, useState } from 'react';
import { Alert, Badge, Button, Card, Select, Spinner, TextField } from '../../../components/ui';
import { bookingsApi, remindersApi, repsApi, ApiError } from '../../../lib/api';
import type { BookingAlert, Reminder, Rep } from '../../../lib/types';

export default function FollowUpsPage() {
  const [reps, setReps] = useState<Rep[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [bookings, setBookings] = useState<BookingAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      const [r, rem, bk] = await Promise.all([repsApi.list(), remindersApi.list(), bookingsApi.list()]);
      setReps(r);
      setReminders(rem);
      setBookings(bk);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load follow-ups.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <div className="space-y-8">
      <header>
        <p className="font-mono text-xs tracking-[0.35em] text-signal">FOLLOW-UPS</p>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight">Reminders & bookings</h1>
        <p className="mt-2 max-w-xl text-sm text-muted">
          Schedule a call to remind a rep of a follow-up — if they&apos;re unavailable, it moves to
          their next free block. Booking alerts from Slack appear below.
        </p>
      </header>

      {error && <Alert>{error}</Alert>}

      {loading ? (
        <div className="grid place-items-center py-16">
          <Spinner className="size-6 text-signal" />
        </div>
      ) : (
        <>
          <ScheduleReminder reps={reps} onScheduled={load} />
          <RemindersList reminders={reminders} onChanged={load} />
          <BookingsList bookings={bookings} />
        </>
      )}
    </div>
  );
}

function ScheduleReminder({ reps, onScheduled }: { reps: Rep[]; onScheduled: () => Promise<void> }) {
  const [repId, setRepId] = useState('');
  const [note, setNote] = useState('');
  const [dueAt, setDueAt] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await remindersApi.create({ repId, note, dueAt: new Date(dueAt).toISOString() });
      setNote('');
      setDueAt('');
      await onScheduled();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to schedule reminder.');
    } finally {
      setSubmitting(false);
    }
  }

  if (reps.length === 0) {
    return (
      <Card className="px-6 py-8 text-center text-sm text-muted">
        Add a rep under <span className="text-paper">Team</span> first to schedule reminders.
      </Card>
    );
  }

  return (
    <section>
      <h2 className="mb-3 text-sm font-medium tracking-wide text-muted">Schedule a reminder</h2>
      <Card className="p-6">
        <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-[200px_1fr_220px_auto] sm:items-end">
          <Select label="Rep" name="rep" value={repId} onChange={(e) => setRepId(e.target.value)} required>
            <option value="">Select rep…</option>
            {reps.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </Select>
          <TextField label="Note" name="note" required value={note} onChange={(e) => setNote(e.target.value)} placeholder="Follow up with Acme about pricing" />
          <TextField label="When" name="dueAt" type="datetime-local" required value={dueAt} onChange={(e) => setDueAt(e.target.value)} />
          <Button type="submit" loading={submitting} disabled={!repId}>
            Schedule
          </Button>
          {error && <div className="sm:col-span-4"><Alert>{error}</Alert></div>}
        </form>
      </Card>
    </section>
  );
}

function RemindersList({ reminders, onChanged }: { reminders: Reminder[]; onChanged: () => Promise<void> }) {
  const tone = (s: Reminder['status']) =>
    s === 'completed' ? 'success' : s === 'failed' || s === 'canceled' ? 'danger' : 'accent';

  return (
    <section>
      <h2 className="mb-3 text-sm font-medium tracking-wide text-muted">Scheduled reminders</h2>
      {reminders.length === 0 ? (
        <Card className="px-6 py-10 text-center text-sm text-muted">No reminders scheduled.</Card>
      ) : (
        <Card className="divide-y divide-line/60">
          {reminders.map((r) => (
            <div key={r.id} className="flex flex-wrap items-center gap-4 px-5 py-4">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-paper">{r.note}</p>
                <p className="truncate text-xs text-muted">
                  {r.rep?.name ?? 'Rep'} · {new Date(r.dueAt).toLocaleString()}
                  {r.attempts > 0 && ` · moved ${r.attempts}×`}
                </p>
              </div>
              <Badge tone={tone(r.status)}>{r.status}</Badge>
              {(r.status === 'scheduled' || r.status === 'rescheduled') && (
                <button
                  type="button"
                  onClick={async () => {
                    await remindersApi.cancel(r.id).catch(() => undefined);
                    await onChanged();
                  }}
                  className="text-xs font-medium text-signal hover:underline"
                >
                  Cancel
                </button>
              )}
            </div>
          ))}
        </Card>
      )}
    </section>
  );
}

function BookingsList({ bookings }: { bookings: BookingAlert[] }) {
  return (
    <section>
      <h2 className="mb-3 text-sm font-medium tracking-wide text-muted">Booking alerts</h2>
      {bookings.length === 0 ? (
        <Card className="px-6 py-10 text-center text-sm text-muted">
          No booking alerts yet. Connect Slack and post appointments to a bookings channel.
        </Card>
      ) : (
        <Card className="divide-y divide-line/60">
          {bookings.map((b) => (
            <div key={b.id} className="flex flex-wrap items-center gap-4 px-5 py-4">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-paper">{b.title}</p>
                <p className="truncate text-xs text-muted">
                  {b.mode} · {b.rep?.name ?? b.hostEmail ?? 'unresolved'} ·{' '}
                  {new Date(b.createdAt).toLocaleString()}
                </p>
              </div>
              <Badge tone={b.status === 'alerted' ? 'success' : b.status === 'failed' ? 'danger' : 'neutral'}>
                {b.status}
              </Badge>
            </div>
          ))}
        </Card>
      )}
    </section>
  );
}
