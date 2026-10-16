import { format } from '@choirbook/shared/i18n';
import { AlertCard } from '@choirbook/ui';
import { PublicFrame } from '@/components/auth/PublicFrame';
import { BuyForm } from '@/components/public/BuyForm';
import { getSaleEvent } from '@/lib/data/buy';
import { formatMoney, formatRange, isoDaysFromNow } from '@/lib/format';
import { getT } from '@/lib/prefs';
import { paymentsEnabled } from '@/lib/stripe';

/** The public ticket page for one concert (optionally through a chorister's sales link). */
export async function BuyPage({ eventId, seller }: { eventId: string | null; seller: { code: string; firstName: string } | null }) {
  const { lang, t } = await getT();
  const sale = eventId ? await getSaleEvent(eventId) : null;
  const frame = (body: React.ReactNode) => (
    <PublicFrame lang={lang} languageLabel={t.account.language} wide>
      {body}
    </PublicFrame>
  );
  if (!sale) return frame(<AlertCard tone="error">{t.staff.buyNotFound}</AlertCard>);
  const { event, types } = sale;
  const now = isoDaysFromNow(0);
  const closed = Boolean(event.cancelled_at) || event.starts_at < now || !types.length;
  const needsCard = types.some((x) => x.price_cents > 0);

  return frame(
    <div className="stack">
      <div className="public__heading">
        <p className="overline overline--accent">{event.organizations.name}</p>
        <h1>{format(t.staff.buyFor, { title: event.title })}</h1>
        <p>
          {formatRange(event.starts_at, event.ends_at, lang)}
          {event.location ? ` · ${event.location}` : ''}
        </p>
        {seller ? <p className="muted">{format(t.staff.buySoldBy, { name: seller.firstName })}</p> : null}
      </div>
      {closed ? (
        <AlertCard tone="info">{t.staff.buyClosed}</AlertCard>
      ) : (
        <>
          {needsCard && !paymentsEnabled() ? <AlertCard tone="info">{t.staff.buyPaymentsOff}</AlertCard> : null}
          <BuyForm
            eventId={event.id}
            sellerCode={seller?.code ?? null}
            locale={lang === 'fr' ? 'fr-CA' : 'en-CA'}
            types={types.map((x) => ({
              id: x.id,
              name: x.name,
              cents: x.price_cents,
              price: formatMoney(x.price_cents, lang),
              left: x.left,
              open: (!x.sales_start_at || x.sales_start_at <= now) && (!x.sales_end_at || x.sales_end_at >= now) && (x.price_cents === 0 || paymentsEnabled()),
            }))}
            s={{
              buyName: t.staff.buyName,
              buyEmail: t.staff.buyEmail,
              buyQty: t.staff.buyQty,
              buyTotal: t.staff.buyTotal,
              buyFree: t.staff.buyFree,
              buyPay: t.staff.buyPay,
              buyGet: t.staff.buyGet,
              buyClosed: t.staff.buyClosed,
              buySoldOut: t.staff.buySoldOut,
              buyPaymentsOff: t.staff.buyPaymentsOff,
              buyPrivacy: t.staff.buyPrivacy,
              failed: t.staff.failed,
              required: t.validation.required,
              badEmail: t.validation.emailInvalid,
            }}
          />
        </>
      )}
    </div>,
  );
}
