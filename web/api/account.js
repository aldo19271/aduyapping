import bcrypt from 'bcryptjs';
import { getSql } from './_lib/db.js';
import { getAuth, signUser, publicUser, send, fail } from './_lib/auth.js';
import { normalizeEmail } from './_lib/email.js';

/** POST { email?, username?, password? } - hanya field yang diisi yang diganti. */
export default async function handler(req, res) {
  if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed' });
  try {
    const auth = getAuth(req);
    if (!auth) return send(res, 401, { error: 'Belum login.' });
    const { email: rawEmail, username, password } = req.body || {};

    const blank = (v) => v == null || (typeof v === 'string' && !v.trim());
    const newName = blank(username) ? null : String(username).trim();
    const newPass = blank(password) ? null : String(password);
    let newEmail = null;
    if (!blank(rawEmail)) {
      newEmail = normalizeEmail(rawEmail);
      if (!newEmail) return send(res, 400, { error: 'Isi Gmail yang valid (contoh: nama@gmail.com).' });
    }
    if (newName && !/^[A-Za-z0-9_]{3,16}$/.test(newName)) {
      return send(res, 400, { error: 'Username 3-16 karakter: huruf, angka, atau underscore.' });
    }
    if (newPass && (newPass.length < 6 || newPass.length > 72)) {
      return send(res, 400, { error: 'Password minimal 6 karakter.' });
    }

    const sql = getSql();
    if (newEmail) {
      const t = await sql`select 1 from users where email = ${newEmail} and id <> ${auth.sub} limit 1`;
      if (t.length) return send(res, 409, { error: 'Gmail sudah dipakai akun lain.' });
    }
    if (newName) {
      const t = await sql`select 1 from users where lower(username) = lower(${newName}) and id <> ${auth.sub} limit 1`;
      if (t.length) return send(res, 409, { error: 'Username sudah dipakai.' });
    }

    const hash = newPass ? await bcrypt.hash(newPass, 10) : null;
    let rows;
    try {
      rows = await sql`
        update users set username = coalesce(${newName}::text, username),
                         email = coalesce(${newEmail}::text, email),
                         password_hash = coalesce(${hash}::text, password_hash)
        where id = ${auth.sub}
        returning id, username, email, coins, wins, equipped_skin, is_admin`;
    } catch (err) {
      if (err && err.code === '23505') return send(res, 409, { error: 'Username atau Gmail sudah dipakai.' });
      throw err;
    }
    if (rows.length === 0) return send(res, 401, { error: 'Akun tidak ditemukan.' });
    const skins = await sql`select skin_id from user_skins where user_id = ${auth.sub}`;
    return send(res, 200, {
      token: signUser(rows[0]),
      user: publicUser(rows[0], skins.map((s) => s.skin_id)),
    });
  } catch (err) {
    return fail(res, err);
  }
}
