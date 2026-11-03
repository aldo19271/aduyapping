const TOKEN_KEY = 'yr_token';

export const tokenStore = {
  get() {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  set(token) {
    try {
      localStorage.setItem(TOKEN_KEY, token);
    } catch {
      /* penyimpanan diblokir */
    }
  },
  clear() {
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch {
      /* penyimpanan diblokir */
    }
  },
};

async function request(path, { method = 'GET', body } = {}) {
  const headers = {};
  if (body) headers['content-type'] = 'application/json';
  const token = tokenStore.get();
  if (token) headers.authorization = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(`/api${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  } catch {
    throw Object.assign(new Error('Tidak bisa terhubung ke server.'), { status: 0 });
  }
  let data = null;
  try {
    data = await res.json();
  } catch {
    /* bukan JSON */
  }
  if (!res.ok) {
    throw Object.assign(new Error((data && data.error) || 'Terjadi kesalahan.'), { status: res.status, data });
  }
  return data;
}

export const api = {
  register: (username, email, password) => request('/register', { method: 'POST', body: { username, email, password } }),
  forgotSend: (email) => request('/forgot', { method: 'POST', body: { action: 'send', email } }),
  forgotReset: (body) => request('/forgot', { method: 'POST', body: { action: 'reset', ...body } }),
  updateAccount: (body) => request('/account', { method: 'POST', body }),
  login: (username, password) => request('/login', { method: 'POST', body: { username, password } }),
  me: () => request('/me'),
  shop: () => request('/shop'),
  buy: (skinId) => request('/shop/buy', { method: 'POST', body: { skinId } }),
  equip: (skinId) => request('/shop/equip', { method: 'POST', body: { skinId } }),
  leaderboard: (bust) => request('/leaderboard' + (bust ? '?t=' + bust : '')),
  admin: (body) => request('/admin', { method: 'POST', body }),
  profile: (name) => request('/profile?name=' + encodeURIComponent(name)),
};
