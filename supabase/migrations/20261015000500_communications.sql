-- Announcements and read receipts; office inbox (conversations and messages);
-- message reports and blocks; monthly updates; in-app notifications and
-- preferences; the outgoing email queue (respects Resend's free daily cap).

create type public.message_category as enum ('absence', 'music', 'fees', 'general');
create type public.conversation_status as enum ('open', 'resolved');
create type public.notification_category as enum (
  'announcements', 'schedule', 'music', 'messages', 'forms', 'fees', 'tickets', 'volunteers', 'system'
);
create type public.email_status as enum ('queued', 'sending', 'sent', 'failed', 'suppressed');

-- ---------------------------------------------------------------------------
-- Announcements
-- ---------------------------------------------------------------------------

create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  title text not null check (length(title) between 1 and 200),
  body text not null check (length(body) <= 10000),
  -- {"all": true} or {"section_ids": [...]} or {"person_ids": [...]}; recipients are expanded into announcement_recipients.
  audience jsonb not null default '{"all": true}'::jsonb,
  pinned boolean not null default false,
  requires_ack boolean not null default false,
  ack_due_on date,
  publish_at timestamptz,
  published_at timestamptz,
  author_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, id)
);
create index announcements_org_pub_idx on public.announcements (organization_id, published_at desc);
create trigger announcements_touch before update on public.announcements
  for each row execute function app.touch_updated_at();

create table public.announcement_recipients (
  organization_id uuid not null,
  announcement_id uuid not null,
  person_id uuid not null,
  read_at timestamptz,
  acknowledged_at timestamptz,
  primary key (announcement_id, person_id),
  foreign key (organization_id, announcement_id) references public.announcements (organization_id, id) on delete cascade,
  foreign key (organization_id, person_id) references public.people (organization_id, id) on delete cascade
);
create index announcement_recipients_person_idx on public.announcement_recipients (person_id);

-- Recipients may only mark their own copy read or acknowledged.
create function app.guard_recipient_update() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if current_setting('app.bypass_guards', true) = 'on' or auth.uid() is null
     or app.has_perm(old.organization_id, 'announcements', 'edit') then
    return new;
  end if;
  if new.announcement_id is distinct from old.announcement_id
     or new.person_id is distinct from old.person_id
     or new.organization_id is distinct from old.organization_id then
    raise exception 'Only read and acknowledged can be changed' using errcode = '42501';
  end if;
  return new;
end $$;
create trigger announcement_recipients_guard before update on public.announcement_recipients
  for each row execute function app.guard_recipient_update();

-- ---------------------------------------------------------------------------
-- Office inbox: a conversation is between one member and the choir office.
-- ---------------------------------------------------------------------------

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  member_id uuid not null,
  subject text not null check (length(subject) between 1 and 200),
  category public.message_category not null default 'general',
  status public.conversation_status not null default 'open',
  assigned_to uuid,
  first_staff_reply_at timestamptz,
  last_message_at timestamptz not null default now(),
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  unique (organization_id, id),
  foreign key (organization_id) references public.organizations (id) on delete cascade,
  foreign key (organization_id, member_id) references public.people (organization_id, id) on delete cascade,
  foreign key (organization_id, assigned_to) references public.people (organization_id, id) on delete set null (assigned_to)
);
create index conversations_org_status_idx on public.conversations (organization_id, status, last_message_at desc);
create index conversations_member_idx on public.conversations (member_id);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  conversation_id uuid not null,
  author_person_id uuid,
  body text not null check (length(body) between 1 and 5000),
  -- Held by the server-side profanity filter until staff review it.
  held_for_review boolean not null default false,
  hidden_at timestamptz,
  hidden_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (organization_id, id),
  foreign key (organization_id, conversation_id) references public.conversations (organization_id, id) on delete cascade,
  foreign key (organization_id, author_person_id) references public.people (organization_id, id) on delete set null (author_person_id)
);
create index messages_conversation_idx on public.messages (conversation_id, created_at);

create table public.message_reports (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  message_id uuid not null,
  reporter_person_id uuid not null,
  reason text not null check (length(reason) between 1 and 1000),
  status text not null default 'open' check (status in ('open', 'actioned', 'dismissed')),
  reviewed_by uuid references auth.users (id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (message_id, reporter_person_id),
  foreign key (organization_id, message_id) references public.messages (organization_id, id) on delete cascade,
  foreign key (organization_id, reporter_person_id) references public.people (organization_id, id) on delete cascade
);

-- Can the caller see this conversation (as its member, or as inbox staff)?
create function app.can_see_conversation(conv uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.conversations c
    where c.id = conv and (app.is_me(c.member_id) or app.has_perm(c.organization_id, 'inbox', 'view'))
  )
$$;
grant execute on function app.can_see_conversation(uuid) to authenticated, service_role;

-- Keep conversation timestamps right and stop suspended members posting.
create function app.on_message_insert() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  conv public.conversations;
begin
  select * into conv from public.conversations where id = new.conversation_id;
  if exists (select 1 from public.people where id = new.author_person_id and messaging_suspended_at is not null) then
    raise exception 'Messaging is paused for this account. Contact your choir office.' using errcode = '42501';
  end if;
  update public.conversations
     set last_message_at = new.created_at,
         first_staff_reply_at = case
           when first_staff_reply_at is null and new.author_person_id is distinct from conv.member_id
           then new.created_at else first_staff_reply_at end,
         status = case when new.author_person_id = conv.member_id then 'open'::public.conversation_status else status end
   where id = new.conversation_id;
  return new;
end $$;
create trigger messages_after_insert after insert on public.messages
  for each row execute function app.on_message_insert();

-- ---------------------------------------------------------------------------
-- Monthly member/family updates
-- ---------------------------------------------------------------------------

create table public.monthly_updates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  month date not null check (extract(day from month) = 1),
  status text not null default 'draft' check (status in ('draft', 'review', 'scheduled', 'sent')),
  conductor_note text check (length(conductor_note) <= 4000),
  free_text text check (length(free_text) <= 4000),
  send_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  unique (organization_id, month),
  unique (organization_id, id)
);

create table public.monthly_update_deliveries (
  organization_id uuid not null,
  update_id uuid not null,
  person_id uuid not null,
  -- The personalised content (attendance, fees, forms…) as sent.
  content jsonb not null default '{}'::jsonb,
  sent_at timestamptz,
  opened_at timestamptz,
  primary key (update_id, person_id),
  foreign key (organization_id, update_id) references public.monthly_updates (organization_id, id) on delete cascade,
  foreign key (organization_id, person_id) references public.people (organization_id, id) on delete cascade
);

-- ---------------------------------------------------------------------------
-- Notifications (in-app) and preferences
-- ---------------------------------------------------------------------------

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  category public.notification_category not null,
  title text not null check (length(title) <= 200),
  body text check (length(body) <= 1000),
  link text check (link ~ '^/'),
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, created_at desc);

create table public.notification_preferences (
  user_id uuid not null references auth.users (id) on delete cascade,
  category public.notification_category not null,
  in_app boolean not null default true,
  email_digest boolean not null default true,
  push boolean not null default false,
  primary key (user_id, category)
);

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Outgoing email queue. Sent by a scheduled edge function, at most the daily cap
-- per day; anything over the cap waits for the next day. Demo choirs never send:
-- their rows are marked "suppressed" and shown in the "would have sent" log.
-- ---------------------------------------------------------------------------

create table public.email_queue (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations (id) on delete cascade,
  to_email extensions.citext not null,
  to_person_id uuid references public.people (id) on delete set null,
  to_guardian_id uuid references public.guardians (id) on delete set null,
  template text not null check (length(template) <= 60),
  subject text not null check (length(subject) <= 200),
  payload jsonb not null default '{}'::jsonb,
  -- Digests group several items for one person into one email.
  digest_key text,
  priority int not null default 5 check (priority between 1 and 9),
  status public.email_status not null default 'queued',
  not_before timestamptz not null default now(),
  attempts int not null default 0,
  last_error text,
  provider_id text,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);
create index email_queue_ready_idx on public.email_queue (status, priority, not_before) where status = 'queued';
create index email_queue_sent_day_idx on public.email_queue (sent_at) where status = 'sent';

create function app.suppress_demo_email() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if exists (select 1 from public.organizations o where o.id = new.organization_id and o.is_demo) then
    new.status := 'suppressed';
  end if;
  return new;
end $$;
create trigger email_queue_demo before insert on public.email_queue
  for each row execute function app.suppress_demo_email();

-- The free plan's daily limit, shared by every choir on this Choirbook install.
create function public.email_daily_cap() returns int
language sql immutable as $$ select 100 $$;

-- Start of today in Toronto, as a timestamp.
create function app.toronto_day_start() returns timestamptz
language sql stable set search_path = '' as $$
  select date_trunc('day', now() at time zone 'America/Toronto') at time zone 'America/Toronto'
$$;

-- Emails sent today (all choirs share the one free account) and how many are
-- left, plus this choir's queue. Staff see it on Communications.
create function public.email_budget_today(org uuid)
returns table (sent_today int, remaining_today int, queued_for_choir int)
language sql stable security definer set search_path = '' as $$
  with sent as (
    select count(*)::int as n from public.email_queue
    where status = 'sent' and sent_at >= app.toronto_day_start()
  )
  select
    sent.n,
    greatest(0, public.email_daily_cap() - sent.n),
    (select count(*)::int from public.email_queue q where q.status = 'queued' and q.organization_id = org)
  from sent
  where app.is_staff(org)
$$;
revoke all on function public.email_budget_today(uuid) from public, anon;
grant execute on function public.email_budget_today(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.announcements enable row level security;
alter table public.announcement_recipients enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.message_reports enable row level security;
alter table public.monthly_updates enable row level security;
alter table public.monthly_update_deliveries enable row level security;
alter table public.notifications enable row level security;
alter table public.notification_preferences enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.email_queue enable row level security;

-- Announcements: recipients see published ones addressed to them; staff see all.
create policy announcements_select on public.announcements for select to authenticated
  using (
    (select app.has_perm(organization_id, 'announcements', 'view'))
    or (
      published_at is not null and published_at <= now()
      and exists (
        select 1 from public.announcement_recipients r
        where r.announcement_id = announcements.id and (select app.is_me(r.person_id))
      )
    )
  );
create policy announcements_write on public.announcements for all to authenticated
  using ((select app.has_perm(organization_id, 'announcements', 'edit')))
  with check ((select app.has_perm(organization_id, 'announcements', 'edit')));

create policy announcement_recipients_select on public.announcement_recipients for select to authenticated
  using ((select app.is_me(person_id)) or (select app.has_perm(organization_id, 'announcements', 'view')));
create policy announcement_recipients_update on public.announcement_recipients for update to authenticated
  using ((select app.is_me(person_id)) or (select app.has_perm(organization_id, 'announcements', 'edit')))
  with check ((select app.is_me(person_id)) or (select app.has_perm(organization_id, 'announcements', 'edit')));
create policy announcement_recipients_insert on public.announcement_recipients for insert to authenticated
  with check ((select app.has_perm(organization_id, 'announcements', 'edit')));
create policy announcement_recipients_delete on public.announcement_recipients for delete to authenticated
  using ((select app.has_perm(organization_id, 'announcements', 'edit')));

-- Conversations: the member starts their own; inbox staff see and manage all.
create policy conversations_select on public.conversations for select to authenticated
  using ((select app.is_me(member_id)) or (select app.has_perm(organization_id, 'inbox', 'view')));
create policy conversations_insert on public.conversations for insert to authenticated
  with check (
    ((select app.is_me(member_id)) and assigned_to is null and status = 'open')
    or (select app.has_perm(organization_id, 'inbox', 'edit'))
  );
create policy conversations_update on public.conversations for update to authenticated
  using ((select app.has_perm(organization_id, 'inbox', 'edit')))
  with check ((select app.has_perm(organization_id, 'inbox', 'edit')));

-- Messages: anyone who can see the conversation reads it; held or hidden
-- messages are visible only to their author and to staff.
create policy messages_select on public.messages for select to authenticated
  using (
    (select app.has_perm(organization_id, 'inbox', 'view'))
    or (
      (select app.can_see_conversation(conversation_id))
      and ((hidden_at is null and not held_for_review) or (select app.is_me(author_person_id)))
    )
  );
create policy messages_insert on public.messages for insert to authenticated
  with check (
    (select app.is_me(author_person_id))
    and (select app.can_see_conversation(conversation_id))
    and hidden_at is null
  );
create policy messages_update on public.messages for update to authenticated
  using ((select app.has_perm(organization_id, 'moderation', 'edit')))
  with check ((select app.has_perm(organization_id, 'moderation', 'edit')));

create policy message_reports_insert on public.message_reports for insert to authenticated
  with check (
    (select app.is_me(reporter_person_id))
    and exists (select 1 from public.messages m where m.id = message_id and (select app.can_see_conversation(m.conversation_id)))
  );
create policy message_reports_select on public.message_reports for select to authenticated
  using ((select app.is_me(reporter_person_id)) or (select app.has_perm(organization_id, 'moderation', 'view')));
create policy message_reports_update on public.message_reports for update to authenticated
  using ((select app.has_perm(organization_id, 'moderation', 'edit')))
  with check ((select app.has_perm(organization_id, 'moderation', 'edit')));

create policy monthly_updates_select on public.monthly_updates for select to authenticated
  using ((select app.has_perm(organization_id, 'monthly_updates', 'view')));
create policy monthly_updates_write on public.monthly_updates for all to authenticated
  using ((select app.has_perm(organization_id, 'monthly_updates', 'edit')))
  with check ((select app.has_perm(organization_id, 'monthly_updates', 'edit')));

create policy monthly_update_deliveries_select on public.monthly_update_deliveries for select to authenticated
  using ((select app.is_me(person_id)) or (select app.has_perm(organization_id, 'monthly_updates', 'view')));
create policy monthly_update_deliveries_write on public.monthly_update_deliveries for all to authenticated
  using ((select app.has_perm(organization_id, 'monthly_updates', 'edit')))
  with check ((select app.has_perm(organization_id, 'monthly_updates', 'edit')));

-- Notifications: your own. They are created by the server, not the browser.
create policy notifications_select on public.notifications for select to authenticated
  using (user_id = (select auth.uid()));
create policy notifications_update on public.notifications for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy notifications_delete on public.notifications for delete to authenticated
  using (user_id = (select auth.uid()));

create policy notification_preferences_own on public.notification_preferences for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy push_subscriptions_own on public.push_subscriptions for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Email queue: staff can read their choir's queue (including the demo's
-- "would have sent" log). Only the server writes to it.
create policy email_queue_select on public.email_queue for select to authenticated
  using ((select app.has_perm(organization_id, 'announcements', 'view')));
