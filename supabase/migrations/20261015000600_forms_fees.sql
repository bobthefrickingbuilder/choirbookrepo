-- Forms and responses; guardian signature links; consents with wording
-- versions; fees, instalments, payments and adjustments (waivers, aid).
-- Money is stored in cents (CAD).

create type public.form_kind as enum ('registration', 'permission', 'medical', 'consent', 'agreement', 'survey', 'other');
create type public.form_status as enum ('draft', 'open', 'closed');
create type public.response_status as enum ('in_progress', 'submitted', 'changes', 'approved');
create type public.consent_kind as enum ('participation', 'code_of_conduct', 'photo_video', 'medical_info');
create type public.payment_method as enum ('card', 'cash', 'cheque', 'etransfer');
create type public.payment_status as enum ('pending', 'succeeded', 'failed', 'refunded', 'partially_refunded');
create type public.adjustment_kind as enum ('waiver', 'financial_aid', 'family_discount', 'other');
create type public.adjustment_status as enum ('requested', 'approved', 'declined');

-- ---------------------------------------------------------------------------
-- Forms
-- ---------------------------------------------------------------------------

create table public.forms (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  season_id uuid,
  title text not null check (length(title) between 1 and 200),
  kind public.form_kind not null default 'other',
  description text check (length(description) <= 4000),
  -- [{ "id": "allergies", "type": "text", "label_en": "...", "label_fr": "...", "required": true }, …]
  fields jsonb not null default '[]'::jsonb check (jsonb_typeof(fields) = 'array'),
  due_on date,
  requires_signature boolean not null default false,
  -- Minors' responses also need a guardian to sign through an emailed link.
  guardian_signature_required boolean not null default false,
  section_ids uuid[] not null default '{}',
  status public.form_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, id),
  foreign key (organization_id, season_id) references public.seasons (organization_id, id) on delete set null (season_id)
);
create trigger forms_touch before update on public.forms
  for each row execute function app.touch_updated_at();

create table public.form_responses (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  form_id uuid not null,
  person_id uuid not null,
  answers jsonb not null default '{}'::jsonb check (jsonb_typeof(answers) = 'object'),
  status public.response_status not null default 'in_progress',
  submitted_at timestamptz,
  signed_name text check (length(signed_name) <= 160),
  signed_at timestamptz,
  signed_ip inet,
  reviewed_by uuid references auth.users (id) on delete set null,
  reviewed_at timestamptz,
  review_note text check (length(review_note) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (form_id, person_id),
  unique (organization_id, id),
  foreign key (organization_id, form_id) references public.forms (organization_id, id) on delete cascade,
  foreign key (organization_id, person_id) references public.people (organization_id, id) on delete cascade
);
create trigger form_responses_touch before update on public.form_responses
  for each row execute function app.touch_updated_at();

-- Members edit their own response until it is submitted (or sent back for changes),
-- and cannot approve themselves.
create function app.guard_form_response() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if current_setting('app.bypass_guards', true) = 'on' or auth.uid() is null
     or app.has_perm(new.organization_id, 'forms', 'edit') then
    return new;
  end if;
  if tg_op = 'UPDATE' and old.status not in ('in_progress', 'changes') then
    raise exception 'This form has already been submitted' using errcode = '42501';
  end if;
  if new.status not in ('in_progress', 'submitted') or new.reviewed_by is not null or new.reviewed_at is not null then
    raise exception 'Only the choir office can review forms' using errcode = '42501';
  end if;
  return new;
end $$;
create trigger form_responses_guard before insert or update on public.form_responses
  for each row execute function app.guard_form_response();

-- Guardian signatures by single-use link. Only a hash of the token is stored;
-- the server checks it, records the signature, and marks the link used.
create table public.guardian_signatures (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  response_id uuid not null,
  guardian_id uuid not null,
  token_hash text not null unique,
  expires_at timestamptz not null,
  sent_at timestamptz,
  used_at timestamptz,
  signed_name text check (length(signed_name) <= 160),
  signed_ip inet,
  signed_user_agent text check (length(signed_user_agent) <= 400),
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  foreign key (organization_id, response_id) references public.form_responses (organization_id, id) on delete cascade,
  foreign key (organization_id, guardian_id) references public.guardians (organization_id, id) on delete cascade
);
create index guardian_signatures_response_idx on public.guardian_signatures (response_id);

-- ---------------------------------------------------------------------------
-- Consents: every grant or withdrawal is a new row (who, when, which wording).
-- ---------------------------------------------------------------------------

create table public.consent_wording_versions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  kind public.consent_kind not null,
  version int not null check (version > 0),
  body_en text not null,
  body_fr text not null,
  effective_at timestamptz not null default now(),
  created_by uuid references auth.users (id) on delete set null,
  unique (organization_id, kind, version),
  unique (organization_id, id)
);

create table public.consents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  person_id uuid not null,
  kind public.consent_kind not null,
  granted boolean not null,
  wording_version_id uuid not null,
  method text not null default 'self' check (method in ('self', 'guardian', 'staff')),
  recorded_by uuid references auth.users (id) on delete set null,
  recorded_at timestamptz not null default now(),
  ip inet,
  foreign key (organization_id, person_id) references public.people (organization_id, id) on delete cascade,
  foreign key (organization_id, wording_version_id) references public.consent_wording_versions (organization_id, id)
);
create index consents_person_kind_idx on public.consents (person_id, kind, recorded_at desc);

-- ---------------------------------------------------------------------------
-- Fees
-- ---------------------------------------------------------------------------

create table public.fees (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  season_id uuid,
  name text not null check (length(name) between 1 and 160),
  description text check (length(description) <= 2000),
  amount_cents int not null check (amount_cents >= 0),
  due_on date,
  allows_instalments boolean not null default false,
  created_at timestamptz not null default now(),
  unique (organization_id, id),
  foreign key (organization_id, season_id) references public.seasons (organization_id, id) on delete set null (season_id)
);

create table public.fee_assignments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  fee_id uuid not null,
  person_id uuid not null,
  amount_cents int not null check (amount_cents >= 0),
  created_at timestamptz not null default now(),
  unique (fee_id, person_id),
  unique (organization_id, id),
  foreign key (organization_id, fee_id) references public.fees (organization_id, id) on delete cascade,
  foreign key (organization_id, person_id) references public.people (organization_id, id) on delete cascade
);
create index fee_assignments_person_idx on public.fee_assignments (person_id);

create table public.instalments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  assignment_id uuid not null,
  due_on date not null,
  amount_cents int not null check (amount_cents > 0),
  foreign key (organization_id, assignment_id) references public.fee_assignments (organization_id, id) on delete cascade
);

-- Payment records are kept for tax law even if the member deletes their account
-- (person_id is cleared, the record stays).
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  assignment_id uuid,
  person_id uuid,
  payer_name text check (length(payer_name) <= 160),
  amount_cents int not null check (amount_cents > 0),
  refunded_cents int not null default 0 check (refunded_cents >= 0),
  method public.payment_method not null,
  status public.payment_status not null default 'pending',
  stripe_payment_intent_id text unique,
  receipt_number text unique,
  note text check (length(note) <= 500),
  received_at timestamptz,
  recorded_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  check (refunded_cents <= amount_cents),
  foreign key (organization_id, assignment_id) references public.fee_assignments (organization_id, id) on delete set null (assignment_id),
  foreign key (organization_id, person_id) references public.people (organization_id, id) on delete set null (person_id)
);
create index payments_assignment_idx on public.payments (assignment_id);

create table public.fee_adjustments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  assignment_id uuid not null,
  kind public.adjustment_kind not null,
  amount_cents int not null check (amount_cents > 0),
  reason text check (length(reason) <= 2000),
  status public.adjustment_status not null default 'requested',
  requested_by uuid references auth.users (id) on delete set null,
  decided_by uuid references auth.users (id) on delete set null,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  foreign key (organization_id, assignment_id) references public.fee_assignments (organization_id, id) on delete cascade
);

-- Members can only ask for aid; deciding is for fee staff.
create function app.guard_fee_adjustment() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if current_setting('app.bypass_guards', true) = 'on' or auth.uid() is null
     or app.has_perm(new.organization_id, 'fees', 'edit') then
    return new;
  end if;
  if new.status <> 'requested' or new.decided_by is not null or new.kind <> 'financial_aid' then
    raise exception 'Only the choir office can approve fee changes' using errcode = '42501';
  end if;
  return new;
end $$;
create trigger fee_adjustments_guard before insert or update on public.fee_adjustments
  for each row execute function app.guard_fee_adjustment();

-- Balance per assignment. security_invoker means the caller's RLS applies.
create view public.fee_balances with (security_invoker = true) as
select
  fa.id as assignment_id,
  fa.organization_id,
  fa.person_id,
  fa.fee_id,
  f.name,
  f.due_on,
  fa.amount_cents,
  coalesce((select sum(p.amount_cents - p.refunded_cents) from public.payments p
            where p.assignment_id = fa.id and p.status in ('succeeded', 'partially_refunded')), 0)::int as paid_cents,
  coalesce((select sum(a.amount_cents) from public.fee_adjustments a
            where a.assignment_id = fa.id and a.status = 'approved'), 0)::int as adjusted_cents
from public.fee_assignments fa
join public.fees f on f.id = fa.fee_id;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.forms enable row level security;
alter table public.form_responses enable row level security;
alter table public.guardian_signatures enable row level security;
alter table public.consent_wording_versions enable row level security;
alter table public.consents enable row level security;
alter table public.fees enable row level security;
alter table public.fee_assignments enable row level security;
alter table public.instalments enable row level security;
alter table public.payments enable row level security;
alter table public.fee_adjustments enable row level security;

create policy forms_select on public.forms for select to authenticated
  using (
    (status <> 'draft' and (select app.is_member(organization_id)))
    or (select app.has_perm(organization_id, 'forms', 'view'))
  );
create policy forms_write on public.forms for all to authenticated
  using ((select app.has_perm(organization_id, 'forms', 'edit')))
  with check ((select app.has_perm(organization_id, 'forms', 'edit')));

create policy form_responses_select on public.form_responses for select to authenticated
  using ((select app.is_me(person_id)) or (select app.has_perm(organization_id, 'forms', 'view')));
create policy form_responses_insert on public.form_responses for insert to authenticated
  with check ((select app.is_me(person_id)) or (select app.has_perm(organization_id, 'forms', 'edit')));
create policy form_responses_update on public.form_responses for update to authenticated
  using ((select app.is_me(person_id)) or (select app.has_perm(organization_id, 'forms', 'edit')))
  with check ((select app.is_me(person_id)) or (select app.has_perm(organization_id, 'forms', 'edit')));

-- Guardian signature links: staff and the chorister can see status. Only the server writes.
create policy guardian_signatures_select on public.guardian_signatures for select to authenticated
  using (
    (select app.has_perm(organization_id, 'forms', 'view'))
    or exists (select 1 from public.form_responses r where r.id = response_id and (select app.is_me(r.person_id)))
  );
-- The token hash is never readable from the browser.
revoke select on public.guardian_signatures from authenticated;
grant select (id, organization_id, response_id, guardian_id, expires_at, sent_at, used_at, signed_name, revoked_at, created_at)
  on public.guardian_signatures to authenticated;

create policy consent_wording_select on public.consent_wording_versions for select to authenticated
  using ((select app.is_member(organization_id)));
create policy consent_wording_insert on public.consent_wording_versions for insert to authenticated
  with check ((select app.has_perm(organization_id, 'settings', 'edit')));
-- Wording versions are never edited, only superseded.

create policy consents_select on public.consents for select to authenticated
  using ((select app.is_me(person_id)) or (select app.has_perm(organization_id, 'roster', 'view')));
create policy consents_insert on public.consents for insert to authenticated
  with check (
    recorded_by = (select auth.uid())
    and (
      ((select app.is_me(person_id)) and method = 'self')
      or ((select app.has_perm(organization_id, 'roster', 'edit')) and method = 'staff')
    )
  );
-- Consents are append-only: no update or delete policies.

create policy fees_select on public.fees for select to authenticated
  using ((select app.is_member(organization_id)));
create policy fees_write on public.fees for all to authenticated
  using ((select app.has_perm(organization_id, 'fees', 'edit')))
  with check ((select app.has_perm(organization_id, 'fees', 'edit')));

create policy fee_assignments_select on public.fee_assignments for select to authenticated
  using ((select app.is_me(person_id)) or (select app.has_perm(organization_id, 'fees', 'view')));
create policy fee_assignments_write on public.fee_assignments for all to authenticated
  using ((select app.has_perm(organization_id, 'fees', 'edit')))
  with check ((select app.has_perm(organization_id, 'fees', 'edit')));

create policy instalments_select on public.instalments for select to authenticated
  using (
    (select app.has_perm(organization_id, 'fees', 'view'))
    or exists (select 1 from public.fee_assignments fa where fa.id = assignment_id and (select app.is_me(fa.person_id)))
  );
create policy instalments_write on public.instalments for all to authenticated
  using ((select app.has_perm(organization_id, 'fees', 'edit')))
  with check ((select app.has_perm(organization_id, 'fees', 'edit')));

-- Payments: the payer sees theirs. Card payments are recorded by the Stripe webhook (server);
-- cash and cheque by fee staff.
create policy payments_select on public.payments for select to authenticated
  using ((select app.is_me(person_id)) or (select app.has_perm(organization_id, 'fees', 'view')));
create policy payments_write on public.payments for all to authenticated
  using ((select app.has_perm(organization_id, 'fees', 'edit')))
  with check ((select app.has_perm(organization_id, 'fees', 'edit')) and method <> 'card');

create policy fee_adjustments_select on public.fee_adjustments for select to authenticated
  using (
    (select app.has_perm(organization_id, 'fees', 'view'))
    or exists (select 1 from public.fee_assignments fa where fa.id = assignment_id and (select app.is_me(fa.person_id)))
  );
create policy fee_adjustments_insert on public.fee_adjustments for insert to authenticated
  with check (
    (select app.has_perm(organization_id, 'fees', 'edit'))
    or (
      requested_by = (select auth.uid())
      and exists (select 1 from public.fee_assignments fa where fa.id = assignment_id and (select app.is_me(fa.person_id)))
    )
  );
create policy fee_adjustments_update on public.fee_adjustments for update to authenticated
  using ((select app.has_perm(organization_id, 'fees', 'edit')))
  with check ((select app.has_perm(organization_id, 'fees', 'edit')));
create policy fee_adjustments_delete on public.fee_adjustments for delete to authenticated
  using ((select app.has_perm(organization_id, 'fees', 'edit')));
