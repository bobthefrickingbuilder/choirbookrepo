import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { CalendarView } from '@/components/member/CalendarView';
import { SubscribeCard } from '@/components/member/SubscribeCard';
import { callsMe, getMemberProfile, getSeasonEvents } from '@/lib/data/member';
import { formatTime, localParts, todayLocal } from '@/lib/format';
import { getT } from '@/lib/prefs';
import { getChoirContext } from '@/lib/session';

export const metadata: Metadata = { title: 'Calendar' };

export default async function CalendarPage({ params, searchParams }: PageProps<'/c/[choir]/calendar'>) {
  const { choir } = await params;
  const { view } = await searchParams;
  const [ctx, { lang, t }] = await Promise.all([getChoirContext(choir), getT()]);
  if (!ctx) notFound();
  const profile = await getMemberProfile(ctx);
  const events = (await getSeasonEvents(ctx)).filter((e) => ctx.isStaff || callsMe(e, profile.sectionId));

  const calendarEvents = events.map((e) => ({
    id: e.id,
    type: e.type,
    title: e.cancelled_at ? `${e.title} (${t.member.cancelled})` : e.title,
    date: localParts(e.starts_at).date,
    start: e.all_day ? undefined : localParts(e.starts_at).time,
    end: e.ends_at && !e.all_day ? localParts(e.ends_at).time : undefined,
    location: e.location ?? undefined,
    status: e.call_at ? <span className="muted">{formatTime(e.call_at, lang)}</span> : undefined,
  }));

  return (
    <div className="page">
      <h1 className="page__title">{t.member.calendarTitle}</h1>
      <CalendarView
        slug={choir}
        events={calendarEvents}
        today={todayLocal()}
        locale={lang === 'fr' ? 'fr-CA' : 'en-CA'}
        view={view === 'month' ? 'month' : 'list'}
        labels={{ list: t.member.viewList, month: t.member.viewMonth, view: t.member.calendarTitle }}
      />
      <SubscribeCard
        slug={choir}
        s={{
          title: t.member.subscribe,
          hint: t.member.subscribeHint,
          copy: t.member.copyLink,
          copied: t.member.copied,
          show: t.member.subscribe,
          apple: t.member.addToCalendar,
          failed: t.member.genericFail,
        }}
      />
    </div>
  );
}
