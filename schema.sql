-- ============================================================
--  SISTEM KEHADIRAN KELAS TAMBAHAN — SKEMA DATABASE (Supabase / PostgreSQL)
--  Jalankan keseluruhan fail ini sekali dalam: Supabase > SQL Editor > New query
-- ============================================================

-- ---------- 1. JADUAL ----------

-- Guru
create table if not exists teachers (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  created_at  timestamptz default now()
);

-- Subjek kelas tambahan (setiap subjek diajar oleh seorang guru; boleh null dulu)
create table if not exists subjects (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  teacher_id  uuid references teachers(id) on delete set null,
  created_at  timestamptz default now()
);

-- Pelajar (nokp = pengenal unik)
create table if not exists students (
  id          uuid primary key default gen_random_uuid(),
  nokp        text unique not null,
  name        text not null,
  kelas       text,
  created_at  timestamptz default now()
);

-- Pendaftaran: pelajar <-> subjek (many-to-many)
create table if not exists enrollments (
  student_id  uuid references students(id) on delete cascade,
  subject_id  uuid references subjects(id) on delete cascade,
  primary key (student_id, subject_id)
);

-- Sesi kehadiran: satu subjek + satu tarikh
create table if not exists attendance_sessions (
  id          uuid primary key default gen_random_uuid(),
  subject_id  uuid references subjects(id) on delete cascade,
  date        date not null,
  created_at  timestamptz default now(),
  unique (subject_id, date)            -- elak rekod bertindih
);

-- Pelajar tidak hadir bagi setiap sesi
create table if not exists absentees (
  session_id  uuid references attendance_sessions(id) on delete cascade,
  student_id  uuid references students(id) on delete cascade,
  reason      text not null default 'Tanpa Sebab',
  primary key (session_id, student_id)
);

create index if not exists idx_sessions_date    on attendance_sessions(date);
create index if not exists idx_enroll_subject   on enrollments(subject_id);
create index if not exists idx_absentees_session on absentees(session_id);

-- ---------- 2. ROW LEVEL SECURITY ----------
-- DEFAULT: terbuka untuk anon supaya aplikasi terus boleh jalan.
-- *** AMARAN: ini bermakna sesiapa dengan URL + anon key boleh baca/tulis. ***
-- Untuk produksi sebenar, lihat bahagian "Keselamatan" dalam PANDUAN.md.

alter table teachers            enable row level security;
alter table subjects            enable row level security;
alter table students            enable row level security;
alter table enrollments         enable row level security;
alter table attendance_sessions enable row level security;
alter table absentees           enable row level security;

create policy p_teachers  on teachers            for all using (true) with check (true);
create policy p_subjects  on subjects            for all using (true) with check (true);
create policy p_students  on students            for all using (true) with check (true);
create policy p_enroll    on enrollments         for all using (true) with check (true);
create policy p_sessions  on attendance_sessions for all using (true) with check (true);
create policy p_absent    on absentees           for all using (true) with check (true);

-- ---------- 3. DATA CONTOH (pilihan — boleh padam bahagian ini) ----------
do $$
declare t1 uuid; t2 uuid; s1 uuid; s2 uuid; p1 uuid; p2 uuid; p3 uuid;
begin
  if (select count(*) from teachers) = 0 then
    insert into teachers(name) values ('Cikgu Aminah binti Osman') returning id into t1;
    insert into teachers(name) values ('Cikgu Rajesh a/l Kumar')   returning id into t2;

    insert into subjects(name, teacher_id) values ('Matematik Tambahan', t1) returning id into s1;
    insert into subjects(name, teacher_id) values ('Fizik', t2)              returning id into s2;

    insert into students(nokp, name, kelas) values ('080101071111','Ahmad Danial bin Roslan','5 Amanah') returning id into p1;
    insert into students(nokp, name, kelas) values ('080203072222','Nur Aisyah binti Kamal','5 Amanah')  returning id into p2;
    insert into students(nokp, name, kelas) values ('080305073333','Tan Wei Jie','5 Bestari')            returning id into p3;

    insert into enrollments(student_id, subject_id) values (p1,s1),(p2,s1),(p3,s1),(p1,s2),(p3,s2);
  end if;
end $$;
