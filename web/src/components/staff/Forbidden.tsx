import type { Messages } from '@choirbook/shared/i18n';
import { Button, Card, EmptyState } from '@choirbook/ui';

/** Shown when a staff member opens an area their role does not include. */
export function Forbidden({ t, homeHref }: { t: Messages; homeHref: string }) {
  return (
    <div className="page">
      <Card padded={false}>
        <EmptyState
          icon="lock"
          title={t.errors.forbiddenTitle}
          actions={
            <Button variant="secondary" iconStart="arrow-left" href={homeHref}>
              {t.common.backHome}
            </Button>
          }
        >
          {t.staff.forbidden}
        </EmptyState>
      </Card>
    </div>
  );
}
