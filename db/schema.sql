-- YappingRace: skema database Neon (Postgres)
-- Jalankan seluruh isi file ini sekali di Neon > SQL Editor.
-- Aman dijalankan ulang (memakai IF NOT EXISTS).
-- Akun guest TIDAK disimpan di database (hanya ada di memori server game).

create extension if not exists pgcrypto;

-- Akun pemain yang login
create table if not exists users (
  id                  uuid primary key default gen_random_uuid(),
  username            text not null,
  email               text,                                               -- Gmail (boleh kosong untuk akun lama), disimpan dalam bentuk baku
  password_hash       text not null,
  coins               integer not null default 0 check (coins >= 0),      -- saldo koin (berkurang saat beli skin)
  total_coins_earned  integer not null default 0 check (total_coins_earned >= 0), -- total koin yang pernah didapat (untuk leaderboard koin)
  wins                integer not null default 0 check (wins >= 0),
  equipped_skin       text not null default 'default',
  is_admin            boolean not null default false,                     -- akun admin
  banned              boolean not null default false,                     -- akun diblokir admin
  created_at          timestamptz not null default now()
);

-- Username unik tanpa membedakan huruf besar/kecil
create unique index if not exists users_username_lower_idx on users (lower(username));

-- Gmail unik (akun lama yang belum punya Gmail dibiarkan kosong)
create unique index if not exists users_email_idx on users (email) where email is not null;

-- Kode verifikasi lupa password (maksimal satu kode aktif per akun)
create table if not exists email_codes (
  user_id     uuid primary key references users(id) on delete cascade,
  code_hash   text not null,
  expires_at  timestamptz not null,
  attempts    smallint not null default 0,
  sent_at     timestamptz not null default now()
);

-- Index leaderboard (top 25)
create index if not exists users_wins_idx on users (wins desc);
create index if not exists users_total_coins_idx on users (total_coins_earned desc);

-- Skin yang sudah dibeli pemain.
-- Daftar skin dan harganya diatur di kode (web/config/skins), bukan di database.
create table if not exists user_skins (
  user_id       uuid not null references users(id) on delete cascade,
  skin_id       text not null,
  purchased_at  timestamptz not null default now(),
  primary key (user_id, skin_id)
);

-- Riwayat pertandingan.
-- id dibuat oleh server game; primary key mencegah hadiah diberikan dua kali
-- jika hasil yang sama terkirim ulang.
create table if not exists matches (
  id            text primary key,
  room_name     text,
  winner_team   smallint not null check (winner_team in (1, 2)),
  player_count  smallint not null,
  finished_at   timestamptz not null default now()
);

-- Hasil tiap pemain login di sebuah pertandingan
create table if not exists match_players (
  match_id      text not null references matches(id) on delete cascade,
  user_id       uuid not null references users(id) on delete cascade,
  team          smallint not null check (team in (1, 2)),
  words_typed   integer not null default 0,
  is_mvp        boolean not null default false,
  won           boolean not null,
  coins_earned  integer not null default 0,
  primary key (match_id, user_id)
);

create index if not exists match_players_user_idx on match_players (user_id);

-- Pesan feedback dari pemain (dibaca admin di menu Admin > Mailbox)
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
