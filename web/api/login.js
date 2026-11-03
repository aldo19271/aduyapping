import bcrypt from 'bcryptjs';
import { getSql } from './_lib/db.js';
import { signUser, publicUser, send, fail } from './_lib/auth.js';

// Hash palsu agar waktu respons tetap mirip saat username tidak ada
let dummyHash;
const getDummyHash = () => (dummyHash ||= bcrypt.hash('tidak-dipakai', 10));

export default async function handler(req, res) {
  if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed' });
  try {
    const { username, password } = req.body || {};
    if (typeof username !== 'string' || typeof password !== 'string') {
      return send(res, 400, { error: 'Isi username dan password.' });
    }
    const sql = getSql();
    const rows = await sql`
      select id, username, email, password_hash, coins, wins, equipped_skin, is_admin, banned
      from users where lower(username) = lower(${username}) limit 1`;
    const row = rows[0];
    const ok = await bcrypt.compare(password, row ? row.password_hash : await getDummyHash());
    if (!row || !ok) return send(res, 401, { error: 'Username atau password salah.' });

    if (row.banned) return send(res, 403, { error: 'Akun ini diblokir admin.' });

    const skins = await sql`select skin_id from user_skins where user_id = ${row.id}`;
    return send(res, 200, {
      token: signUser(row),
      user: publicUser(row, skins.map((s) => s.skin_id)),
    });
  } catch (err) {
    return fail(res, err);
  }
}
