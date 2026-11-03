import jwt from 'jsonwebtoken';
import { SKINS, DEFAULT_SKIN } from '../../config/skins.js';

/** Skin yang tidak dikenal (misalnya id lama di database) dianggap skin default. */
export function normalizeSkin(id) {
  return SKINS.some((s) => s.id === id) ? id : DEFAULT_SKIN;
}

function secret() {
  const s = process.env.JWT_SECRET;
  if (!s || s.length < 16) throw new Error('JWT_SECRET belum diisi (minimal 16 karakter).');
  return s;
}

/** Token login (dikirim ke browser, juga dibaca oleh server game). */
export function signUser(row) {
  return jwt.sign(
    { sub: row.id, name: row.username, skin: normalizeSkin(row.equipped_skin), typ: 'user' },
    secret(),
    { expiresIn: '30d', algorithm: 'HS256' },
  );
}

/** Mengembalikan payload token jika valid, selain itu null. */
export function getAuth(req) {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : '';
  if (!token) return null;
  try {
    const p = jwt.verify(token, secret(), { algorithms: ['HS256'] });
    return p && p.typ === 'user' ? p : null;
  } catch {
    return null;
  }
}

export function send(res, status, body) {
  res.setHeader('Cache-Control', 'no-store');
  res.status(status).json(body);
}

/** Bentuk data user yang dikirim ke browser. */
export function publicUser(row, ownedSkins) {
  const owned = new Set([DEFAULT_SKIN, ...(ownedSkins || [])]);
  return {
    id: row.id,
    name: row.username,
    ...(row.email !== undefined ? { email: row.email || null } : {}),
    ...(row.is_admin ? { admin: true } : {}),
    coins: row.coins,
    wins: row.wins,
    skin: normalizeSkin(row.equipped_skin),
    owned: SKINS.filter((s) => owned.has(s.id)).map((s) => s.id),
  };
}

export function fail(res, err) {
  console.error(err);
  return send(res, 500, { error: 'Terjadi kesalahan di server.' });
}
