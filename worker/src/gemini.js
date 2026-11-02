import { fallbackWords, shuffle } from './words.js';

function cleanList(list) {
  const seen = new Set();
  const out = [];
  for (const raw of list) {
    const w = String(raw ?? '')
      .toLowerCase()
      .trim();
    if (!/^[a-z]{2,14}$/.test(w) || seen.has(w)) continue;
    seen.add(w);
    out.push(w);
  }
  return out;
}

/**
 * Minta Gemini membuat n kata. Jika gagal / kurang, dilengkapi kata cadangan
 * sehingga game selalu bisa berjalan.
 * Mengembalikan { words, source } dengan source = 'gemini' | 'fallback' | 'mixed'.
 */
export async function generateWords(env, n) {
  if (!env.GEMINI_API_KEY) return { words: fallbackWords(n), source: 'fallback' };

  const model = env.GEMINI_MODEL || 'gemini-3.5-flash-lite';
  const prompt =
    `Berikan ${n} kata bahasa Indonesia yang acak dan umum dipakai sehari-hari. ` +
    'Aturan: huruf kecil semua, tanpa tanda baca, tanpa angka, tanpa spasi, satu kata per item, ' +
    'panjang 3 sampai 9 huruf, tidak boleh ada kata yang sama. Balas hanya berupa JSON array berisi string.';

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 9000);
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: 'application/json', temperature: 1.2 },
        }),
        signal: ctrl.signal,
      },
    );
    if (!res.ok) {
      let detail = '';
      try {
        detail = (await res.text()).replace(/\s+/g, ' ').slice(0, 200);
      } catch {
        /* abaikan */
      }
      throw new Error(`gemini ${res.status} ${detail}`);
    }
    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('') || '[]';
    let parsed = JSON.parse(text);
    if (!Array.isArray(parsed)) parsed = Object.values(parsed).flat();
    let words = cleanList(parsed);
    if (words.length >= n) {
      console.log('Kata dari Gemini:', words.length);
      return { words: shuffle(words).slice(0, n), source: 'gemini' };
    }
    if (words.length >= Math.ceil(n * 0.4)) {
      const extra = fallbackWords(n * 2).filter((w) => !words.includes(w));
      words = words.concat(extra).slice(0, n);
      return { words: shuffle(words), source: 'mixed' };
    }
    throw new Error('gemini terlalu sedikit kata');
  } catch (err) {
    console.log('Gemini gagal, memakai kata cadangan:', err && err.message);
    return { words: fallbackWords(n), source: 'fallback' };
  } finally {
    clearTimeout(timer);
  }
}
