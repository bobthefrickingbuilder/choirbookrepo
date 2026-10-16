'use client';

import type { Lang } from '@choirbook/shared/i18n';
import { AnnouncementItem } from '@choirbook/ui';
import { useRouter } from 'next/navigation';
import { useEffect, useTransition } from 'react';
import { acknowledgeAnnouncement, markAnnouncementsRead } from '@/app/actions/messages';

export interface FeedItem {
  id: string;
  title: string;
  body: string;
  date: string;
  pinned: boolean;
  unread: boolean;
  requiresAck: boolean;
  acknowledged: boolean;
  acknowledgedAt?: string;
  ackDue?: string;
}

/** The announcement feed. Opening it marks what is on screen as read (still shown as new this time). */
export function AnnouncementsFeed({ slug, items, lang }: { slug: string; items: FeedItem[]; lang: Lang }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const unreadIds = items.filter((i) => i.unread).map((i) => i.id);
  const unreadKey = unreadIds.join(',');

  useEffect(() => {
    if (!unreadKey) return;
    void markAnnouncementsRead(slug, unreadKey.split(','));
  }, [slug, unreadKey]);

  return (
    <div className="ann-feed">
      {items.map((a) => (
        <div key={a.id} id={`a-${a.id}`}>
          <AnnouncementItem
            title={a.title}
            date={a.date}
            body={<p style={{ whiteSpace: 'pre-line' }}>{a.body}</p>}
            pinned={a.pinned}
            unread={a.unread}
            requiresAck={a.requiresAck}
            acknowledged={a.acknowledged}
            acknowledgedAt={a.acknowledgedAt}
            ackDue={a.ackDue}
            onAcknowledge={() =>
              startTransition(async () => {
                await acknowledgeAnnouncement(slug, a.id);
                router.refresh();
              })
            }
            lang={lang}
          />
        </div>
      ))}
    </div>
  );
}
