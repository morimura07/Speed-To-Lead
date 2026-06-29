import { parseBooking, parseSlackLead } from './booking.util';

describe('parseBooking', () => {
  it('prefers a labeled host/closer email', () => {
    const r = parseBooking('New booking with Acme\nCloser: Jane@Example.com\nnoise foo@bar.com');
    expect(r.title).toBe('New booking with Acme');
    expect(r.hostEmail).toBe('jane@example.com');
  });

  it('falls back to any email in the text', () => {
    const r = parseBooking('Demo call booked — contact bob@acme.io');
    expect(r.hostEmail).toBe('bob@acme.io');
  });

  it('handles a message with no email', () => {
    const r = parseBooking('Strategy session booked for 3pm');
    expect(r.title).toBe('Strategy session booked for 3pm');
    expect(r.hostEmail).toBeNull();
  });
});

describe('parseSlackLead', () => {
  it('extracts name, email, and phone', () => {
    const lead = parseSlackLead('Jane Prospect\nemail jane@lead.com\ncall +1 (555) 010-2020', 'ts-1');
    expect(lead.externalId).toBe('ts-1');
    expect(lead.name).toBe('Jane Prospect');
    expect(lead.email).toBe('jane@lead.com');
    expect(lead.phone).toBe('+15550102020');
  });

  it('still produces a lead with only a name', () => {
    const lead = parseSlackLead('Inbound lead from website', 'ts-2');
    expect(lead.name).toBe('Inbound lead from website');
    expect(lead.email).toBeUndefined();
  });
});
