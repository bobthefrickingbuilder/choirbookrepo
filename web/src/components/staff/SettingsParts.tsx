'use client';

import { AlertCard, Button, ConfirmDialog, IconButton, Modal, RadioGroup, Select, TextInput } from '@choirbook/ui';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import {
  deleteSectionOrPart,
  deleteTerm,
  makeSeasonCurrent,
  newConsentVersion,
  saveChoirDetails,
  savePart,
  savePolicies,
  saveSeason,
  saveSection,
  saveTerm,
  setLogo,
} from '@/app/actions/settings';
import type { StaffStrings } from '@/lib/staff';
import { createClient } from '@/lib/supabase/browser';

type Result = { ok: true } | { ok: false; error: string };

function useRun(s: StaffStrings) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const run = (fn: () => Promise<Result>, after?: () => void) =>
    start(async () => {
      const r = await fn();
      if (!r.ok) {
        setSaved(false);
        return setError(s.errors[r.error] ?? s.failed);
      }
      setError(null);
      setSaved(true);
      after?.();
      router.refresh();
    });
  return { pending, error, setError, saved, run };
}

export function ChoirDetailsForm({
  slug,
  orgId,
  initial,
  logoUrl,
  s,
}: {
  slug: string;
  orgId: string;
  initial: { name: string; short_name: string; brand_color: string; kind: 'youth' | 'adult'; default_lang: 'en' | 'fr' };
  logoUrl: string | null;
  s: StaffStrings;
}) {
  const [v, setV] = useState(initial);
  const { pending, error, setError, saved, run } = useRun(s);
  const [uploading, setUploading] = useState(false);
  const router = useRouter();

  const uploadLogo = async (file: File) => {
    if (file.size > 1024 * 1024) return setError(s.logoHint);
    const ext = (file.name.split('.').pop() ?? 'png').toLowerCase().replace('jpeg', 'jpg');
    if (!['png', 'svg', 'webp', 'jpg'].includes(ext)) return setError(s.logoHint);
    setUploading(true);
    const path = `${orgId}/logo-${crypto.randomUUID()}.${ext}`;
    const { error: upErr } = await createClient().storage.from('choir-logos').upload(path, file, { contentType: file.type || undefined });
    if (upErr) {
      setUploading(false);
      return setError(s.failed);
    }
    const r = await setLogo(slug, path);
    setUploading(false);
    if (!r.ok) return setError(s.errors[r.error] ?? s.failed);
    router.refresh();
  };

  return (
    <div className="stack">
      {error ? <AlertCard tone="error">{error}</AlertCard> : null}
      {saved && !error ? <AlertCard tone="success">{s.saved}</AlertCard> : null}
      <div className="form-2col">
        <TextInput label={s.choirName} value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} maxLength={120} />
        <TextInput label={s.shortName} value={v.short_name} onChange={(e) => setV({ ...v, short_name: e.target.value })} maxLength={8} />
        <div className="stack" style={{ gap: 6 }}>
          <label className="cb-label" htmlFor="brand-color">
            {s.brandColor}
          </label>
          <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input id="brand-color" type="color" className="color-input" value={v.brand_color || '#9b2c2c'} onChange={(e) => setV({ ...v, brand_color: e.target.value })} />
            <code>{v.brand_color || '—'}</code>
          </span>
          <span className="muted small">{s.brandColorHint}</span>
        </div>
        <Select
          label={s.defaultLang}
          value={v.default_lang}
          onChange={(e) => setV({ ...v, default_lang: e.target.value as 'en' | 'fr' })}
          options={[
            { value: 'en', label: 'English' },
            { value: 'fr', label: 'Français' },
          ]}
        />
        <div style={{ gridColumn: '1 / -1' }}>
          <RadioGroup
            label={s.choirKind}
            name="choir-kind"
            value={v.kind}
            onChange={(k) => setV({ ...v, kind: k as 'youth' | 'adult' })}
            options={[
              { value: 'youth', label: s.kindYouth },
              { value: 'adult', label: s.kindAdult },
            ]}
          />
        </div>
      </div>
      <div className="stack" style={{ gap: 8 }}>
        <span className="cb-label">{s.logo}</span>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          {logoUrl ? <img src={logoUrl} alt="" width={56} height={56} style={{ objectFit: 'contain', borderRadius: 8, background: 'var(--surface-muted)' }} /> : null}
          <label className="file-pick">
            <input type="file" accept="image/png,image/svg+xml,image/webp,image/jpeg" onChange={(e) => e.target.files?.[0] && void uploadLogo(e.target.files[0])} />
            <span className="cb-btn cb-btn--secondary cb-btn--sm">{uploading ? s.uploading : s.uploadLogo}</span>
          </label>
          {logoUrl ? (
            <Button size="sm" variant="ghost" iconStart="x" onClick={() => run(() => setLogo(slug, null))}>
              {s.removeLogo}
            </Button>
          ) : null}
          <span className="muted small">{s.logoHint}</span>
        </div>
      </div>
      <div>
        <Button iconStart="check" loading={pending} onClick={() => run(() => saveChoirDetails(slug, v))}>
          {s.save}
        </Button>
      </div>
    </div>
  );
}

export function RangeForm({
  kind,
  slug,
  id,
  seasonId,
  initial,
  s,
}: {
  kind: 'season' | 'term';
  slug: string;
  id?: string;
  seasonId?: string;
  initial?: { name: string; starts_on: string; ends_on: string; absence_limit?: string };
  s: StaffStrings;
}) {
  const [open, setOpen] = useState(false);
  const [v, setV] = useState({ name: '', starts_on: '', ends_on: '', absence_limit: '', ...(initial ?? {}) });
  const { pending, error, run } = useRun(s);
  const title = id ? s.edit : kind === 'season' ? s.addSeason : s.addTerm;
  return (
    <>
      {id ? (
        <IconButton icon="pencil" size="sm" label={`${s.edit}: ${v.name}`} onClick={() => setOpen(true)} />
      ) : (
        <Button size="sm" variant={kind === 'season' ? 'secondary' : 'ghost'} iconStart="plus" onClick={() => setOpen(true)}>
          {title}
        </Button>
      )}
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={title}
        closeLabel={s.close}
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              {s.cancel}
            </Button>
            <Button
              loading={pending}
              disabled={!v.name.trim() || !v.starts_on || !v.ends_on}
              onClick={() => run(() => (kind === 'season' ? saveSeason(slug, id ?? null, v) : saveTerm(slug, id ?? null, seasonId!, v)), () => setOpen(false))}
            >
              {s.save}
            </Button>
          </>
        }
      >
        <div className="form-2col">
          {error ? (
            <div style={{ gridColumn: '1 / -1' }}>
              <AlertCard tone="error">{error}</AlertCard>
            </div>
          ) : null}
          <div style={{ gridColumn: '1 / -1' }}>
            <TextInput label={kind === 'season' ? s.seasonName : s.termName} value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} maxLength={60} placeholder={kind === 'season' ? '2026–27' : 'Fall'} />
          </div>
          <TextInput label={s.startsOn} type="date" value={v.starts_on} onChange={(e) => setV({ ...v, starts_on: e.target.value })} />
          <TextInput label={s.endsOn} type="date" value={v.ends_on} min={v.starts_on} onChange={(e) => setV({ ...v, ends_on: e.target.value })} />
          {kind === 'term' ? (
            <TextInput label={s.absenceLimit} hint={s.absenceLimitHint} optional inputMode="numeric" value={v.absence_limit} onChange={(e) => setV({ ...v, absence_limit: e.target.value.replace(/\D/g, '') })} />
          ) : null}
        </div>
      </Modal>
    </>
  );
}

export function SmallAction({ slug, kind, id, label, s }: { slug: string; kind: 'current' | 'deleteTerm' | 'deleteSection' | 'deletePart'; id: string; label: string; s: StaffStrings }) {
  const [confirm, setConfirm] = useState(false);
  const { pending, error, run } = useRun(s);
  const act = () =>
    run(() =>
      kind === 'current' ? makeSeasonCurrent(slug, id) : kind === 'deleteTerm' ? deleteTerm(slug, id) : deleteSectionOrPart(slug, kind === 'deleteSection' ? 'section' : 'part', id),
    );
  if (kind === 'current') {
    return (
      <Button size="sm" variant="ghost" loading={pending} onClick={act}>
        {s.makeCurrent}
      </Button>
    );
  }
  return (
    <>
      <IconButton icon="trash-2" size="sm" label={`${s.delete}: ${label}`} onClick={() => setConfirm(true)} />
      <ConfirmDialog
        open={confirm}
        title={`${s.delete}: ${label}`}
        tone="danger"
        confirmLabel={s.delete}
        cancelLabel={s.cancel}
        loading={pending}
        onCancel={() => setConfirm(false)}
        onConfirm={() => {
          act();
          setConfirm(false);
        }}
      >
        {error ?? s.confirmDelete}
      </ConfirmDialog>
    </>
  );
}

export function SectionForm({
  slug,
  kind,
  id,
  sectionId,
  initial,
  s,
}: {
  slug: string;
  kind: 'section' | 'part';
  id?: string;
  sectionId?: string;
  initial?: { key: string; name_en: string; name_fr: string; sort: number };
  s: StaffStrings;
}) {
  const [open, setOpen] = useState(false);
  const [v, setV] = useState(initial ?? { key: '', name_en: '', name_fr: '', sort: 0 });
  const { pending, error, run } = useRun(s);
  const title = id ? s.edit : kind === 'section' ? s.addSection : s.addPart;
  return (
    <>
      {id ? (
        <IconButton icon="pencil" size="sm" label={`${s.edit}: ${v.name_en}`} onClick={() => setOpen(true)} />
      ) : (
        <Button size="sm" variant={kind === 'section' ? 'secondary' : 'ghost'} iconStart="plus" onClick={() => setOpen(true)}>
          {title}
        </Button>
      )}
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={title}
        closeLabel={s.close}
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              {s.cancel}
            </Button>
            <Button
              loading={pending}
              disabled={!v.key || !v.name_en.trim() || !v.name_fr.trim()}
              onClick={() => run(() => (kind === 'section' ? saveSection(slug, id ?? null, v) : savePart(slug, id ?? null, sectionId!, v)), () => setOpen(false))}
            >
              {s.save}
            </Button>
          </>
        }
      >
        <div className="form-2col">
          {error ? (
            <div style={{ gridColumn: '1 / -1' }}>
              <AlertCard tone="error">{error}</AlertCard>
            </div>
          ) : null}
          <TextInput label={s.key} hint={s.keyHint} value={v.key} onChange={(e) => setV({ ...v, key: e.target.value.replace(/[^A-Za-z0-9]/g, '').slice(0, 6) })} />
          <TextInput label={s.sortOrder} inputMode="numeric" value={String(v.sort)} onChange={(e) => setV({ ...v, sort: Number(e.target.value.replace(/\D/g, '')) || 0 })} />
          <TextInput label={s.nameEn} value={v.name_en} onChange={(e) => setV({ ...v, name_en: e.target.value })} maxLength={60} />
          <TextInput label={s.nameFr} value={v.name_fr} onChange={(e) => setV({ ...v, name_fr: e.target.value })} maxLength={60} />
        </div>
      </Modal>
    </>
  );
}

export function PoliciesForm({ slug, initial, s }: { slug: string; initial: { late_after_minutes: number; family_discount_default: number; etransfer_instructions: string }; s: StaffStrings }) {
  const [v, setV] = useState({ late: String(initial.late_after_minutes), discount: String(initial.family_discount_default), etransfer: initial.etransfer_instructions });
  const { pending, error, saved, run } = useRun(s);
  return (
    <div className="stack">
      {error ? <AlertCard tone="error">{error}</AlertCard> : null}
      {saved && !error ? <AlertCard tone="success">{s.saved}</AlertCard> : null}
      <div className="form-2col">
        <TextInput label={s.lateAfter} inputMode="numeric" value={v.late} onChange={(e) => setV({ ...v, late: e.target.value.replace(/\D/g, '') })} />
        <TextInput label={s.familyDiscountDefault} inputMode="numeric" suffix="%" value={v.discount} onChange={(e) => setV({ ...v, discount: e.target.value.replace(/\D/g, '') })} />
        <div style={{ gridColumn: '1 / -1' }}>
          <TextInput label={s.etransferNote} optional multiline rows={2} value={v.etransfer} onChange={(e) => setV({ ...v, etransfer: e.target.value })} maxLength={1000} />
        </div>
      </div>
      <div>
        <Button
          iconStart="check"
          loading={pending}
          onClick={() => run(() => savePolicies(slug, { late_after_minutes: Number(v.late) || 0, family_discount_default: Math.min(100, Number(v.discount) || 0), etransfer_instructions: v.etransfer }))}
        >
          {s.save}
        </Button>
      </div>
    </div>
  );
}

export function ConsentVersionForm({ slug, kind, label, current, s }: { slug: string; kind: string; label: string; current: { en: string; fr: string } | null; s: StaffStrings }) {
  const [open, setOpen] = useState(false);
  const [v, setV] = useState({ en: current?.en ?? '', fr: current?.fr ?? '' });
  const { pending, error, run } = useRun(s);
  return (
    <>
      <Button size="sm" variant="ghost" iconStart="plus" onClick={() => setOpen(true)}>
        {s.newVersion}
      </Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={`${label} · ${s.newVersion}`}
        size="lg"
        closeLabel={s.close}
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              {s.cancel}
            </Button>
            <Button loading={pending} disabled={v.en.trim().length < 10 || v.fr.trim().length < 10} onClick={() => run(() => newConsentVersion(slug, kind, v.en, v.fr), () => setOpen(false))}>
              {s.save}
            </Button>
          </>
        }
      >
        <div className="stack">
          {error ? <AlertCard tone="error">{error}</AlertCard> : null}
          <p className="muted small" style={{ margin: 0 }}>
            {s.consentIntro}
          </p>
          <TextInput label={s.wordingEn} multiline rows={5} value={v.en} onChange={(e) => setV({ ...v, en: e.target.value })} maxLength={8000} />
          <TextInput label={s.wordingFr} multiline rows={5} value={v.fr} onChange={(e) => setV({ ...v, fr: e.target.value })} maxLength={8000} />
        </div>
      </Modal>
    </>
  );
}
