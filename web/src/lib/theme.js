import { useEffect, useState } from 'react';

// Tema tampilan: 'normal' (default) atau 'doodle' (coretan pensil di kertas bergaris, hitam-putih).
const KEY = 'yr_theme';
const THEMES = ['normal', 'doodle'];
const listeners = new Set();
let theme = read();

function read() {
  try {
    const v = localStorage.getItem(KEY);
    return THEMES.includes(v) ? v : 'normal';
  } catch {
    return 'normal';
  }
}

const FONT_HREF =
  'https://fonts.googleapis.com/css2?family=Caveat:wght@600;700&family=Patrick+Hand&display=swap';

// Memuat font tulisan tangan hanya saat tema Doodle dipakai.
function ensureAssets() {
  if (typeof document === 'undefined') return;
  if (!document.getElementById('doodle-font')) {
    const link = document.createElement('link');
    link.id = 'doodle-font';
    link.rel = 'stylesheet';
    link.href = FONT_HREF;
    document.head.appendChild(link);
  }
}

function apply() {
  if (typeof document === 'undefined') return;
  document.documentElement.setAttribute('data-theme', theme);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', theme === 'doodle' ? '#ffffff' : '#0b0b0b');
  if (theme === 'doodle') {
    if (document.body) ensureAssets();
    else document.addEventListener('DOMContentLoaded', ensureAssets, { once: true });
  }
}

apply();

export function getTheme() {
  return theme;
}

export function setTheme(next) {
  if (!THEMES.includes(next)) return;
  theme = next;
  try {
    localStorage.setItem(KEY, theme);
  } catch {
    /* penyimpanan diblokir */
  }
  apply();
  listeners.forEach((fn) => fn(theme));
}

/** Hook: [tema, setTema] */
export function useTheme() {
  const [t, setT] = useState(theme);
  useEffect(() => {
    listeners.add(setT);
    return () => listeners.delete(setT);
  }, []);
  return [t, setTheme];
}
