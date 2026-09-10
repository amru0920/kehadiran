-- =====================================================================
--  TAMBAHAN: KEHADIRAN PERJUMPAAN KOKURIKULUM
--  Jalankan fail ini kalau jadual koku_units & koku_members SUDAH ada
--  (ahli sudah diimport) tetapi tab Kehadiran keluar ralat
--  "Could not find the table 'public.koku_sessions'".
--
--  Supabase Dashboard > SQL Editor > tampal & Run.
--  Selamat — tidak menyentuh data unit atau ahli yang sedia ada.
-- =====================================================================

-- 6) PERJUMPAAN / LATIHAN + KEHADIRAN ----------------------------------
--    Satu perjumpaan bagi satu unit pada satu tarikh.
--    Hanya murid TIDAK HADIR disimpan (sama corak dengan kehadiran kelas).
create table if not exists public.koku_sessions (
  id            uuid primary key default gen_random_uuid(),
  unit_id       uuid not null references public.koku_units(id) on delete cascade,
  sdate         date not null,
  activity      text,                    -- cth: 'Kawad kaki', 'Mesyuarat Agung'
  session_time  text,                    -- cth: '16:00-17:30'
  recorded_by   text,
  recorded_name text,
  created_at    timestamptz not null default now(),
  unique (unit_id, sdate)
);

create table if not exists public.koku_absentees (
  id         uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.koku_sessions(id) on delete cascade,
  student_id uuid not null references public.students(id)      on delete cascade,
  reason     text,
  unique (session_id, student_id)
);

create index if not exists koku_sessions_unit_idx   on public.koku_sessions(unit_id, sdate);
create index if not exists koku_absentees_sess_idx  on public.koku_absentees(session_id);
create index if not exists koku_absentees_stud_idx  on public.koku_absentees(student_id);

alter table public.koku_sessions   enable row level security;
alter table public.koku_absentees  enable row level security;
drop policy if exists koku_sessions_auth  on public.koku_sessions;
drop policy if exists koku_absentees_auth on public.koku_absentees;
create policy koku_sessions_auth  on public.koku_sessions  for all to authenticated using (true) with check (true);
create policy koku_absentees_auth on public.koku_absentees for all to authenticated using (true) with check (true);

select 'siap' as status,
       (select count(*) from public.koku_units)   as unit,
       (select count(*) from public.koku_members) as ahli,
       (select count(*) from public.koku_sessions) as perjumpaan;
