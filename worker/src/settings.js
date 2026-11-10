// Id 'default' tidak ada di daftar skin web, sehingga tampilan otomatis memakai skin pertama di web/config/skins.js.
export const DEFAULT_SKIN = 'default';

const clamp = (v, min, max, fallback) => {
  const n = Math.round(Number(v));
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
};

const cleanText = (v, max) =>
  String(v ?? '')
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .trim()
    .slice(0, max);

/**
 * Membersihkan pengaturan room dari client.
 * `base` = pengaturan lama (untuk update parsial). Mengembalikan { ok, settings } atau { ok:false, error }.
 */
export function sanitizeSettings(input, base, hostName) {
  const src = input && typeof input === 'object' ? input : {};
  const prev = base || {};

  const name =
    cleanText(src.name ?? prev.name, 24) || `Room ${cleanText(hostName, 12) || 'baru'}`;
  const max = clamp(src.max ?? prev.max, 2, 8, 2);
  const isPrivate = src.isPrivate === undefined ? !!prev.isPrivate : !!src.isPrivate;
  const damage = clamp(src.damage ?? prev.damage, 1, 50, 5);
  const hp = clamp(src.hp ?? prev.hp, 10, 1000, 100);
  const maxWords = clamp(src.maxWords ?? prev.maxWords, 50, 500, 300);

  const mode = (src.mode ?? prev.mode) === 'solo' ? 'solo' : 'team';
  const prevNames = Array.isArray(prev.teamNames) ? prev.teamNames : [];
  const srcNames = Array.isArray(src.teamNames) ? src.teamNames : [];
  const teamNames = [0, 1].map(
    (i) => cleanText(srcNames[i] ?? prevNames[i], 14) || (i === 0 ? 'Tim Merah' : 'Tim Biru'),
  );
  const specOn = src.specOn === undefined ? (prev.specOn === undefined ? true : !!prev.specOn) : !!src.specOn;
  const specMax = clamp(src.specMax ?? prev.specMax, 1, 5, 5);

  const timerOn = src.timerOn === undefined ? (prev.timerOn === undefined ? true : !!prev.timerOn) : !!src.timerOn;
  const timerMin = clamp(src.timerMin ?? prev.timerMin, 1, 60, 5);

  let password = prev.password || '';
  if (typeof src.password === 'string' && src.password.length > 0) {
    password = cleanText(src.password, 20);
  }
  if (!isPrivate) password = '';
  if (isPrivate && !password) {
    return { ok: false, error: 'Room private harus punya password.' };
  }

  return {
    ok: true,
    settings: { name, max, isPrivate, password, damage, hp, maxWords, mode, teamNames, specOn, specMax, timerOn, timerMin },
  };
}

/** Pengaturan yang aman dikirim ke client (tanpa password). */
export function publicSettings(s) {
  return {
    name: s.name,
    max: s.max,
    isPrivate: s.isPrivate,
    damage: s.damage,
    hp: s.hp,
    maxWords: s.maxWords,
    mode: s.mode || 'team',
    teamNames: s.teamNames || ['Tim Merah', 'Tim Biru'],
    specOn: s.specOn !== false,
    specMax: s.specMax || 5,
    timerOn: s.timerOn !== false,
    timerMin: s.timerMin || 5,
  };
}
