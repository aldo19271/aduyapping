import bcrypt from 'bcryptjs';
import { getSql } from './_lib/db.js';
import { getAuth, send, fail } from './_lib/auth.js';
import { normalizeEmail } from './_lib/email.js';

const USER_RE = /^[A-Za-z0-9_]{3,16}$/;
const clip = (v, n) => String(v == null ? '' : v).replace(/\s+/g, ' ').trim().slice(0, n);

/**
 * POST { action, ... }
 *  feedback_send  (akun login)  { name, message }
 *  users_list / feedback_list / feedback_delete / user_create / user_update / user_ban  (admin saja)
 * Satu file agar jumlah fungsi Vercel tetap 12.
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed' });
  try {
    const auth = getAuth(req);
    if (!auth) return send(res, 401, { error: 'Login dulu.' });
    const body = req.body || {};
    const sql = getSql();
    const me = (await sql`select id, username, is_admin, banned from users where id = ${auth.sub} limit 1`)[0];
    if (!me || me.banned) return send(res, 401, { error: 'Akun tidak valid.' });

    if (body.action === 'feedback_send') {
      const name = clip(body.name, 40);
      const message = String(body.message == null ? '' : body.message).trim().slice(0, 1000);
      if (!name) return send(res, 400, { error: 'Isi nama dulu.' });
      if (message.length < 3) return send(res, 400, { error: 'Isi deskripsi feedback dulu.' });
      const last = await sql`select 1 from feedback where user_id = ${me.id} and created_at > now() - interval '30 seconds' limit 1`;
      if (last.length) return send(res, 429, { error: 'Tunggu sebentar sebelum kirim lagi.' });
      await sql`insert into feedback (user_id, username, name, message) values (${me.id}, ${me.username}, ${name}, ${message})`;
      return send(res, 200, { ok: true });
    }

    if (!me.is_admin) return send(res, 403, { error: 'Khusus admin.' });

    switch (body.action) {
      case 'users_list': {
        const users = await sql`
          select id, username, email, coins, wins, is_admin, banned, created_at
          from users order by is_admin desc, created_at asc limit 500`;
        return send(res, 200, { users });
      }
      case 'feedback_list': {
        const items = await sql`
          select id, username, name, message, created_at from feedback order by created_at desc limit 200`;
        return send(res, 200, { items });
      }
      case 'feedback_delete': {
        await sql`delete from feedback where id = ${String(body.id || '')}`;
        return send(res, 200, { ok: true });
      }
      case 'user_create': {
        const username = clip(body.username, 16);
        const password = String(body.password || '');
        const email = body.email && String(body.email).trim() ? normalizeEmail(body.email) : null;
        if (!USER_RE.test(username)) return send(res, 400, { error: 'Username 3-16 karakter: huruf, angka, atau underscore.' });
        if (password.length < 6 || password.length > 72) return send(res, 400, { error: 'Password minimal 6 karakter.' });
        if (body.email && String(body.email).trim() && !email) return send(res, 400, { error: 'Gmail tidak valid.' });
        const dup = await sql`select 1 from users where lower(username) = lower(${username}) limit 1`;
        if (dup.length) return send(res, 409, { error: 'Username sudah dipakai.' });
        if (email) {
          const d = await sql`select 1 from users where email = ${email} limit 1`;
          if (d.length) return send(res, 409, { error: 'Gmail sudah dipakai akun lain.' });
        }
        const hash = await bcrypt.hash(password, 10);
        try {
          await sql`insert into users (username, email, password_hash) values (${username}, ${email}, ${hash})`;
        } catch (err) {
          if (err && err.code === '23505') return send(res, 409, { error: 'Username atau Gmail sudah dipakai.' });
          throw err;
        }
        return send(res, 200, { ok: true });
      }
      case 'user_update': {
        const id = String(body.id || '');
        const blank = (v) => v == null || !String(v).trim();
        const newName = blank(body.username) ? null : clip(body.username, 16);
        const newPass = blank(body.password) ? null : String(body.password);
        const newEmail = blank(body.email) ? null : normalizeEmail(body.email);
        if (!blank(body.email) && !newEmail) return send(res, 400, { error: 'Gmail tidak valid.' });
        if (newName && !USER_RE.test(newName)) return send(res, 400, { error: 'Username 3-16 karakter: huruf, angka, atau underscore.' });
        if (newPass && (newPass.length < 6 || newPass.length > 72)) return send(res, 400, { error: 'Password minimal 6 karakter.' });
        if (newName) {
          const t = await sql`select 1 from users where lower(username) = lower(${newName}) and id <> ${id} limit 1`;
          if (t.length) return send(res, 409, { error: 'Username sudah dipakai.' });
        }
        if (newEmail) {
          const t = await sql`select 1 from users where email = ${newEmail} and id <> ${id} limit 1`;
          if (t.length) return send(res, 409, { error: 'Gmail sudah dipakai akun lain.' });
        }
        const hash = newPass ? await bcrypt.hash(newPass, 10) : null;
        let rows;
        try {
          rows = await sql`
            update users set username = coalesce(${newName}::text, username),
                             email = coalesce(${newEmail}::text, email),
                             password_hash = coalesce(${hash}::text, password_hash)
            where id = ${id} returning id`;
        } catch (err) {
          if (err && err.code === '23505') return send(res, 409, { error: 'Username atau Gmail sudah dipakai.' });
          throw err;
        }
        if (!rows.length) return send(res, 404, { error: 'Akun tidak ditemukan.' });
        return send(res, 200, { ok: true });
      }
      case 'user_ban': {
        const banned = body.banned !== false;
        let rows;
        if (body.id) {
          if (String(body.id) === String(me.id)) return send(res, 400, { error: 'Tidak bisa memblokir akun sendiri.' });
          rows = await sql`update users set banned = ${banned} where id = ${String(body.id)} and is_admin = false returning id`;
        } else {
          const name = String(body.name || '');
          if (name.toLowerCase() === String(me.username).toLowerCase()) return send(res, 400, { error: 'Tidak bisa memblokir akun sendiri.' });
          rows = await sql`update users set banned = ${banned} where lower(username) = lower(${name}) and is_admin = false returning id`;
        }
        if (!rows.length) return send(res, 404, { error: 'Akun tidak ditemukan.' });
        return send(res, 200, { ok: true });
      }
      default:
        return send(res, 400, { error: 'Aksi tidak dikenal.' });
    }
  } catch (err) {
    return fail(res, err);
  }
}
