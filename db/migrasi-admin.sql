-- YappingRace: migrasi fitur Admin, Feedback, dan Ban
-- Jalankan sekali di Neon > SQL Editor. Aman dijalankan ulang.
-- Data lama tidak berubah; hanya menambah kolom, tabel, dan akun admin.

create extension if not exists pgcrypto;

alter table users add column if not exists is_admin boolean not null default false;
alter table users add column if not exists banned   boolean not null default false;

create table if not exists feedback (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references users(id) on delete set null,
  username    text not null,
  name        text not null,
  message     text not null,
  created_at  timestamptz not null default now()
);
create index if not exists feedback_created_idx on feedback (created_at desc);

-- Akun admin bawaan (username: admin, password: admin). GANTI password setelah login pertama.
insert into users (username, password_hash, is_admin)
select 'admin', crypt('admin', gen_salt('bf', 10)), true
where not exists (select 1 from users where lower(username) = 'admin');

update users set is_admin = true where lower(username) = 'admin';
