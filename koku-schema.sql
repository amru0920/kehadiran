-- =====================================================================
--  MODUL KOKURIKULUM - SMK Batu Maung
--  Sumber unit & guru penasihat: Manual Pengurusan Sekolah Tahun 2026
--  (5.4 Unit Beruniform, 5.5 Kelab & Persatuan,
--   5.6 Sukan & Permainan, 5.7 Rumah Sukan)
--
--  CARA GUNA: Supabase Dashboard > SQL Editor > tampal & Run.
--  Selamat dijalankan berulang kali (idempotent).
-- =====================================================================

-- 1) UNIT KOKURIKULUM ---------------------------------------------------
create table if not exists public.koku_units (
  id         uuid primary key default gen_random_uuid(),
  category   text not null check (category in ('beruniform','kelab','sukan','rumah')),
  name       text not null,
  advisors   text,                       -- senarai guru penasihat, (K) = ketua
  meet_day   text,                       -- hari perjumpaan / latihan
  active     boolean not null default true,
  sort       integer not null default 0,
  created_at timestamptz not null default now(),
  unique (category, name)
);

-- 2) AHLI (murid dalam unit) --------------------------------------------
create table if not exists public.koku_members (
  id         uuid primary key default gen_random_uuid(),
  unit_id    uuid not null references public.koku_units(id) on delete cascade,
  student_id uuid not null references public.students(id)   on delete cascade,
  category   text not null,              -- disalin dari unit
  role       text not null default 'Ahli',
  created_at timestamptz not null default now(),
  unique (unit_id, student_id),
  unique (student_id, category)          -- 1 murid = 1 unit bagi setiap kategori
);

create index if not exists koku_members_unit_idx    on public.koku_members(unit_id);
create index if not exists koku_members_student_idx on public.koku_members(student_id);

-- 3) RLS: guru yang sudah log masuk boleh baca/tulis --------------------
alter table public.koku_units   enable row level security;
alter table public.koku_members enable row level security;

drop policy if exists koku_units_auth   on public.koku_units;
drop policy if exists koku_members_auth on public.koku_members;
create policy koku_units_auth   on public.koku_units   for all to authenticated using (true) with check (true);
create policy koku_members_auth on public.koku_members for all to authenticated using (true) with check (true);

-- 4) SENARAI UNIT (38 unit dari manual sekolah) -------------------------
insert into public.koku_units (category, name, advisors, sort) values
  ('beruniform','Kadet Bomba dan Penyelamat','Nor Farhan binti Ngah (K), Anis Syakira binti Abd. Aziz, Nik Mohamad Hafizi bin Samsol, Nurul Izzatie binti Abd Rahim, Dasilah binti Silahuddin',1),
  ('beruniform','Kadet Remaja Sekolah','Alya Basyirah binti Remli (K), Teh Swee Chin, Hariany binti Mohd Hassan, Nur Athirah Izzati binti Zulkifle',2),
  ('beruniform','Angkatan Pertahanan Awam','Syamila binti Nordin (K), Nur Ainatul Mardhiah binti Azman, Thanalacthumy a/p Nadaraju, Nur Athirah binti Mohd Saufi',3),
  ('beruniform','Kor Kadet Polis','Alea Najaa binti Ismail (K), Nurazwani binti Mohd Yusoff, Nurul Azwani binti Hisham, Nur Amalina binti Elias, Masturah binti Kamarul Zaman',4),
  ('beruniform','Pergerakan Puteri Islam Malaysia','Nor Amalina binti Mohd Jaffar (K), Nadiah binti Rosdi',5),
  ('beruniform','Persatuan Pandu Puteri Malaysia','Amira binti Zunikasma (K), Rosmawamurni binti Ismail, Munirah binti Salim',6),
  ('beruniform','Pengakap Malaysia','Nurul Ashikin binti Arifin (K), Ummi Shobirah binti Ali, Suria Kumari a/p Nadaraja, Yamunah a/p Bhaskaran, Siti Fatimah binti Mohamad Annuar (PPKI), Noor Sabrina binti Idris (PPKI), Zainab binti Yahya Arif (PPKI), Nurliyana Haily binti Ali (PPKI)',7),
  ('beruniform','St. John Ambulans Malaysia','Nur Amani Lowe binti Mohd Shafiq Lowe (K), Khor Siew Jyue, Nurul Husna binti Azizan, Fatimah Al-Zahra binti Azhar',8),
  ('kelab','Kelab Doktor Muda','Ummi Shobirah binti Ali (K), Nurazwani binti Yusof',1),
  ('kelab','Kelab Kerjaya','Siti Nagiha binti Mat Radzi (K), Siti Hazirah binti Hassan',2),
  ('kelab','Kelab Malaysiaku','Norhanani binti Ilias (K), Rosmawamurni binti Ismail, Siti Fatimah binti Mohamad Annuar (PPKI), Noor Sabrina binti Idris (PPKI), Zainab binti Yahya Arif (PPKI), Nurliyana Haily binti Ali (PPKI)',3),
  ('kelab','Kelab Alam Sekitar','Hariany binti Mohd Hassan (K), Amira binti Zunikasma, Yamunah a/p Bhaskaran',4),
  ('kelab','Kelab Fotografi, TVPSS dan ICT','Munirah binti Salim (K), Nik Mohamad Hafizi bin Samsol, Nur Athirah Izzati binti Zulkifle',5),
  ('kelab','Kelab Rakan Muda','Masturah binti Kamarul Zaman (K), Nur Ainatul Mardhiah binti Azman, Mohamad Rozidi bin Mat Nor, Suria Kumari a/p Nadaraja',6),
  ('kelab','Kelab Sains, Teknologi, Kejuruteraan dan Matematik (STEM)','Nurul Izzatie binti Abd Rahim (K), Nur Amani Lowe binti Mohd Shafiq Lowe, Syamila binti Nordin, Nurul Husna binti Azizan',7),
  ('kelab','Kelab Sejarah','Muhammad Hakimi bin Rosli (K), Nurfadhlina binti Abdul Halim',8),
  ('kelab','Persatuan Agama Islam','Nadiah binti Rosdi (K), Norasikin binti Rashid Ali',9),
  ('kelab','Persatuan Bahasa Melayu','Nurul Azwani binti Hisham (K), Nurul Ashikin binti Arifin',10),
  ('kelab','Persatuan Bahasa Inggeris/Cina/Tamil','Anis Syakira binti Abd. Aziz (K), Lam Mei Ching (BI), Teh Swee Chin (BC), Thanalacthumy a/p Nadaraju (BT)',11),
  ('kelab','Kelab Kemahiran Al-Quran','Fathimah Al-Zahra binti Azhar (K), Irsaili Rafifi bin Ismail, Alya Basyirah binti Remli',12),
  ('kelab','Kelab Kebudayaan','Nur Athirah binti Mohd Saufi (K), Nur Amalina binti Elias',13),
  ('kelab','Kelab Nilam','Nurul Hidayah binti Mohd Isa (K), Alea Najaa binti Ismail',14),
  ('sukan','Badminton','Khor Siew Jyue (K), Norhanani binti Ilias, Nur Athirah binti Mohd Saufi, Masturah binti Kamarul Zaman, Siti Fatimah binti Mohamad Annuar (PPKI), Noor Sabrina binti Idris (PPKI), Zainab binti Yahya Arif (PPKI), Nurliyana Haily binti Ali (PPKI)',1),
  ('sukan','Bola Baling & Dodgeball','Nurazwani binti Mohd Yusoff (K), Nurul Ashikin binti Arifin, Suria Kumari a/p Nadaraja',2),
  ('sukan','Bola Jaring','Dasilah binti Silahuddin (K), Nor Amalina binti Mohd Jaffar',3),
  ('sukan','Bola Keranjang & Frisbee','Lam Mei Ching (K), Fathimah Al-Zahra binti Azhar',4),
  ('sukan','Bola Sepak','Nur Amalina binti Elias (K), Muhammad Hakimi bin Rosli, Nadiah binti Rosdi',5),
  ('sukan','Hoki','Mohamad Rozidi bin Mat Nor (K)',6),
  ('sukan','Memanah','Nur Athirah Izzati binti Zulkifle (K), Munirah binti Salim',7),
  ('sukan','Olahraga','Nurfadhlina binti Abdul Halim (K), Syamila binti Nordin, Ummi Shobirah binti Ali',8),
  ('sukan','Ping Pong & Pickleball','Nurul Husna binti Azizan (K), Nurul Hidayah binti Mohd Isa, Malarvele a/p Govindasamy',9),
  ('sukan','Sepak Takraw','Nik Mohamad Hafizi bin Samsol (K), Alea Najaa binti Ismail',10),
  ('sukan','Pelayaran & Sukan Air','Irsaili Rafifi bin Ismail (K), Nur Amani Lowe binti Mohd Shafiq Lowe',11),
  ('sukan','Petanque','Nur Ainatul Mardhiah binti Azman (K), Alya Basyirah binti Remli',12),
  ('rumah','Rumah Juara (Merah)','Norhidayah binti Abdul Aziz (Moderator), Nurul Husna binti Azizan (K), Yamunah a/p Bhaskaran, Siti Nagiha binti Mat Radzi, Nur Amalina binti Elias, Anis Syakira binti Abd. Aziz, Fazilah binti Mat Zain, Mohamad Rozidi bin Mat Nor, Nur Ainatul Mardhiah binti Azman, Nurfadhlina binti Abdul Halim, Nurul Ashikin binti Arifin, Zainab binti Yahya Arif (PPKI)',1),
  ('rumah','Rumah Satria (Kuning)','Kuang Eng Guan (Moderator), Syamila binti Nordin (K), Alea Najaa binti Ismail, Nur Athirah Izzati binti Zulkifle, Hariany binti Mohd Hassan, Muhammad Hakimi bin Rosli, Norasikin binti Rashid Ali, Norhanani binti Ilias, Nurul Izzatie binti Abd Rahim, Suria Kumari a/p Nadaraja, Ummi Shobirah binti Ali, Siti Fatimah binti Mohamad Annuar (PPKI)',2),
  ('rumah','Rumah Waja (Hijau)','Tuan Naemah binti Tuan Mat (Moderator), Masturah binti Kamarul Zaman (K), Nik Mohamad Hafizi bin Samsol, Fathimah Al-Zahra binti Azhar, Nor Amalina binti Mohd Jaffar, Nor Farhan binti Ngah, Siti Hazirah binti Hassan, Khor Siew Jyue, Nurul Hidayah binti Mohd Isa, Teh Swee Chin, Thanalacthumy a/p Nadaraju, Amira binti Zunikasma, Nurliyana Haily binti Ali (PPKI)',3),
  ('rumah','Rumah Wira (Biru)','Farzerim Rohaida binti Husin (Moderator), Nur Athirah binti Mohd Saufi (K), Munirah binti Salim, Nurazwani binti Mohd Yusoff, Irsaili Rafifi bin Ismail, Alya Basyirah binti Remli, Lam Mei Ching, Nur Amani Lowe binti Mohd Shafiq Lowe, Nurul Azwani binti Hisham, Nadiah binti Rosdi, Malarvele a/p Govindasamy, Noor Sabrina binti Idris (PPKI)',4)
on conflict (category, name) do update
  set advisors = excluded.advisors,
      sort     = excluded.sort;

-- 5) Hari latihan sukan petang (4.00 - 5.30 ptg) ------------------------
update public.koku_units set meet_day='Isnin'        where category='sukan' and name in ('Badminton','Bola Sepak','Memanah');
update public.koku_units set meet_day='Selasa'       where category='sukan' and name in ('Bola Baling & Dodgeball','Ping Pong & Pickleball','Sepak Takraw');
update public.koku_units set meet_day='Rabu'         where category='sukan' and name in ('Olahraga','Hoki','Petanque');
update public.koku_units set meet_day='Khamis'       where category='sukan' and name in ('Bola Jaring','Bola Keranjang & Frisbee');
update public.koku_units set meet_day='Sabtu (pagi)' where category='sukan' and name in ('Pelayaran & Sukan Air');

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

select category, count(*) as jumlah_unit from public.koku_units group by category order by category;
