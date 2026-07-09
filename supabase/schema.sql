-- ============================================================
--  BarberApp — Supabase schema (גרסה 2 — בטוח להרצה חוזרת)
--  אפשר להריץ את כל הקובץ הזה ב-SQL Editor כמה פעמים שרוצים
-- ============================================================

-- ---------- טבלאות ----------
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

create table if not exists admin_notifications (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists settings (
  key text primary key,
  value jsonb,
  updated_at timestamptz not null default now()
);

-- ---------- הגנה מפני תפיסת אותו סלוט פעמיים ----------
create unique index if not exists appointments_slot_unique
  on appointments ((data->>'date'), (data->>'time'))
  where (data->>'status') <> 'cancelled';

-- ---------- Realtime (מוגן — מדלג על טבלאות שכבר רשומות) ----------
do $$
declare t text;
begin
  foreach t in array array[
    'services','clients','appointments','journal_entries',
    'expenses','activity_log','notification_log','admin_notifications','settings'
  ]
  loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table %I', t);
    end if;
  end loop;
end $$;

-- ---------- RLS + מדיניות גישה (בטוח להרצה חוזרת) ----------
do $$
declare t text;
begin
  foreach t in array array[
    'services','clients','appointments','journal_entries',
    'expenses','activity_log','notification_log','admin_notifications','settings'
  ]
  loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists "anon all access" on %I', t);
    execute format('create policy "anon all access" on %I for all using (true) with check (true)', t);
  end loop;
end $$;
