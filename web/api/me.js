import { getSql } from './_lib/db.js';
import { getAuth, signUser, publicUser, send, fail } from './_lib/auth.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return send(res, 405, { error: 'Method not allowed' });
  try {
    const auth = getAuth(req);
    if (!auth) return send(res, 401, { error: 'Belum login.' });
    const sql = getSql();
    const rows = await sql`
      select id, username, email, coins, wins, equipped_skin, is_admin, banned from users where id = ${auth.sub} limit 1`;
    if (rows.length === 0) return send(res, 401, { error: 'Akun tidak ditemukan.' });
    if (rows[0].banned) return send(res, 401, { error: 'Akun ini diblokir admin.' });
    const skins = await sql`select skin_id from user_skins where user_id = ${auth.sub}`;
    return send(res, 200, {
      token: signUser(rows[0]),
      user: publicUser(rows[0], skins.map((s) => s.skin_id)),
    });
  } catch (err) {
    return fail(res, err);
  }
}
