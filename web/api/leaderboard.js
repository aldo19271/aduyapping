import { getSql } from './_lib/db.js';
import { send, fail } from './_lib/auth.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return send(res, 405, { error: 'Method not allowed' });
  try {
    const sql = getSql();
    const [wins, coins] = await Promise.all([
      sql`select username as name, wins as value from users
          where wins > 0 and not banned order by wins desc, created_at asc limit 25`,
      sql`select username as name, coins as value from users
          where coins > 0 and not banned order by coins desc, created_at asc limit 25`,
    ]);
    res.setHeader('Cache-Control', 's-maxage=15, stale-while-revalidate=30');
    return res.status(200).json({ wins, coins });
  } catch (err) {
    return fail(res, err);
  }
}
