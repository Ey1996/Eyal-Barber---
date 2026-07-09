-- ============================================================
--  BarberApp — Supabase schema
--  הריצו את כל הקובץ הזה ב-SQL Editor של Supabase (New query -> Run)
-- ============================================================

-- כל טבלה שומרת פריט אחד בשורה: id + גוף הנתונים כ-JSON.
-- זה מאפשר לאפליקציה לסנכרן את המבנה שלה אחד-לאחד.

create table if not exists services (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists clients (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists appointments (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists journal_entries (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists expenses (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists activity_log (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists notification_log (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists settings (
  key text primary key,
  value jsonb,
  updated_at timestamptz not null default now()
);

-- הגנה מפני race condition: שני לקוחות לא יכולים לתפוס את אותו סלוט.
-- אינדקס ייחודי על תאריך+שעה עבור תורים שאינם מבוטלים.
create unique index if not exists appointments_slot_unique
  on appointments ((data->>'date'), (data->>'time'))
  where (data->>'status') <> 'cancelled';

-- Realtime: משדר שינויים לכל המכשירים המחוברים (האדמין רואה תורים חדשים חי)
alter publication supabase_realtime add table services;
alter publication supabase_realtime add table clients;
alter publication supabase_realtime add table appointments;
alter publication supabase_realtime add table journal_entries;
alter publication supabase_realtime add table expenses;
alter publication supabase_realtime add table activity_log;
alter publication supabase_realtime add table notification_log;
alter publication supabase_realtime add table settings;

-- ------------------------------------------------------------
-- RLS — Row Level Security
-- MVP: פתוח לקריאה/כתיבה עם מפתח anon כדי שהאפליקציה תעבוד מיד.
-- שלב הקשחה (מומלץ בהמשך): החליפו למדיניות מבוססת Supabase Auth,
-- כך שכתיבה לטבלאות הניהול תותר רק לחשבון המנהל המאומת.
-- ------------------------------------------------------------
alter table services enable row level security;
alter table clients enable row level security;
alter table appointments enable row level security;
alter table journal_entries enable row level security;
alter table expenses enable row level security;
alter table activity_log enable row level security;
alter table notification_log enable row level security;
alter table settings enable row level security;

do $$
declare t text;
begin
  foreach t in array array['services','clients','appointments','journal_entries','expenses','activity_log','notification_log','settings']
  loop
    execute format('drop policy if exists "anon all access" on %I', t);
    execute format('create policy "anon all access" on %I for all using (true) with check (true)', t);
  end loop;
end $$;
