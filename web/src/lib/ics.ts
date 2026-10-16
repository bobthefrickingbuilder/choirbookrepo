// Builds iCalendar (.ics) files that Google, Apple and Outlook calendars understand.

export interface IcsEvent {
  id: string;
  title: string;
  description?: string | null;
  startsAt: string;
  endsAt?: string | null;
  allDay?: boolean;
  location?: string | null;
  updatedAt?: string | null;
}

const escapeText = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');

const utcStamp = (iso: string) => new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

const dateStamp = (iso: string) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Toronto', year: 'numeric', month: '2-digit', day: '2-digit' })
    .format(new Date(iso))
    .replace(/-/g, '');

/** Lines longer than 75 octets must be folded (RFC 5545 §3.1). */
function fold(line: string): string {
  const out: string[] = [];
  let rest = line;
  while (new TextEncoder().encode(rest).length > 75) {
    let cut = 74;
    while (new TextEncoder().encode(rest.slice(0, cut)).length > 74) cut--;
    out.push(rest.slice(0, cut));
    rest = ' ' + rest.slice(cut);
  }
  out.push(rest);
  return out.join('\r\n');
}

export function buildIcs(calendarName: string, events: IcsEvent[]): string {
  const now = utcStamp(new Date().toISOString());
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Choirbook//Choirbook//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeText(calendarName)}`,
    'X-WR-TIMEZONE:America/Toronto',
    'REFRESH-INTERVAL;VALUE=DURATION:PT6H',
  ];
  for (const e of events) {
    lines.push('BEGIN:VEVENT', `UID:${e.id}@choirbook`, `DTSTAMP:${e.updatedAt ? utcStamp(e.updatedAt) : now}`);
    if (e.allDay) {
      const day = dateStamp(e.startsAt);
      const next = dateStamp(new Date(Date.parse(e.startsAt) + 86_400_000).toISOString());
      lines.push(`DTSTART;VALUE=DATE:${day}`, `DTEND;VALUE=DATE:${next}`);
    } else {
      lines.push(`DTSTART:${utcStamp(e.startsAt)}`);
      lines.push(`DTEND:${utcStamp(e.endsAt ?? new Date(Date.parse(e.startsAt) + 2 * 3600_000).toISOString())}`);
    }
    lines.push(`SUMMARY:${escapeText(e.title)}`);
    if (e.location) lines.push(`LOCATION:${escapeText(e.location)}`);
    if (e.description) lines.push(`DESCRIPTION:${escapeText(e.description)}`);
    lines.push('END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  return lines.map(fold).join('\r\n') + '\r\n';
}
