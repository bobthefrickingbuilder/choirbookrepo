import { Button, EmptyState } from '@choirbook/ui';
import { getT } from '@/lib/prefs';

export default async function NotFound() {
  const { t } = await getT();
  return (
    <main className="public" id="main">
      <div className="public__card public__card--wide">
        <EmptyState
          icon="search"
          title={t.errors.notFoundTitle}
          actions={
            <Button variant="secondary" iconStart="arrow-left" href="/">
              {t.common.backHome}
            </Button>
          }
        >
          {t.errors.notFoundBody}
        </EmptyState>
      </div>
    </main>
  );
}
