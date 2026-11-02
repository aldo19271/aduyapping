import { DurableObject } from 'cloudflare:workers';
import { verifyToken } from './jwt.js';
import { sanitizeSettings, publicSettings } from './settings.js';
import { generateWords } from './gemini.js';
import { shuffle } from './words.js';

// ---- Angka yang bisa diatur ----
const GRACE_MS = 12_000; // waktu tunggu jika koneksi pemain putus sebelum dianggap keluar
const READY_TIMEOUT_MS = 12_000; // batas menunggu semua pemain siap di halaman game
const COUNTDOWN_FROM = 3; // hitung mundur sebelum mulai (detik)
const MIN_WORD_GAP_MS = 120; // jeda minimal antar kata (anti bot kasar)
const REFILL_WAIT_MS = 5_000; // jeda sebelum kata gelombang berikutnya
const MAX_TOTAL_WORDS = 5000;
const RESET_AFTER_END_MS = 6_000;
const LOBBY_PING_MS = 25_000;
const COINS_WIN = 10;
const COINS_LOSE = 5;
const CHAT_MAX_LEN = 120; // panjang pesan chat
const CHAT_GAP_MS = 350; // jeda minimal antar pesan chat per pemain
const CHAT_KEEP = 40; // jumlah pesan terakhir yang disimpan untuk pemain yang baru masuk

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Room: satu instance per kode room. Semua aturan game dihitung di sini (server otoritatif):
 * client hanya melaporkan kata yang diketik, server yang menghitung damage, target, menang/kalah.
 */
export class Room extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.resetAll();
  }

  resetAll() {
    this.inited = false;
    this.code = '';
    this.settings = null;
    this.hostId = null;
    this.players = new Map();
    this.status = 'lobby'; // lobby | loading | countdown | playing | finished
    this.orderSeq = 0;
    this.words = [];
    this.chat = [];
    this.chatSeq = 0;
    this.refilling = false;
    this.runId = 0;
    this.pingTimer = null;
    this.readyTimer = null;
    this.resetTimer = null;
  }

  // ------------------------------------------------------------ koneksi
  async fetch(request) {
    const url = new URL(request.url);

    if (url.pathname === '/init' && request.method === 'POST') {
      const b = await request.json();
      this.resetAll();
      this.inited = true;
      this.code = b.code;
      this.settings = b.settings;
      this.hostId = b.host.id;
      return new Response('ok');
    }

    if (request.headers.get('Upgrade') !== 'websocket') {
      return new Response('Expected websocket', { status: 426 });
    }

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    server.accept();

    const claims = await verifyToken(url.searchParams.get('ticket'), this.env.JWT_SECRET);
    if (!claims || claims.typ !== 'ticket') {
      this.send(server, { type: 'error', code: 'auth', message: 'Sesi tidak valid, muat ulang halaman.' });
      server.close(1008, 'auth');
      return new Response(null, { status: 101, webSocket: client });
    }
    if (!this.inited) {
      this.send(server, { type: 'error', code: 'not_found', message: 'Room tidak ditemukan.' });
      server.close(1000, 'not_found');
      return new Response(null, { status: 101, webSocket: client });
    }

    server.user = { id: claims.sub, name: String(claims.name), skin: claims.skin, guest: !!claims.guest };
    server.addEventListener('message', (ev) => this.onMessage(server, ev.data));
    server.addEventListener('close', () => this.onClose(server));
    server.addEventListener('error', () => this.onClose(server));
    return new Response(null, { status: 101, webSocket: client });
  }

  send(ws, obj) {
    try {
      if (ws && ws.readyState === 1) ws.send(JSON.stringify(obj));
    } catch {
      /* socket tertutup */
    }
  }

  broadcast(obj) {
    const s = JSON.stringify(obj);
    for (const p of this.players.values()) {
      try {
        if (p.ws && p.ws.readyState === 1) p.ws.send(s);
      } catch {
        /* socket tertutup */
      }
    }
  }

  broadcastRoom() {
    this.broadcast({ type: 'room', room: this.snapshot() });
  }

  current(ws) {
    const p = ws.user && this.players.get(ws.user.id);
    return p && p.ws === ws && !p.left ? p : null;
  }

  activePlayers() {
    return [...this.players.values()].filter((p) => !p.left).sort((a, b) => a.order - b.order);
  }

  allPlayers() {
    return [...this.players.values()].sort((a, b) => a.order - b.order);
  }

  snapshot() {
    return {
      code: this.code,
      status: this.status,
      hostId: this.hostId,
      settings: publicSettings(this.settings),
      players: this.activePlayers().map((p) => ({
        id: p.id,
        name: p.name,
        skin: p.skin,
        guest: p.guest,
        connected: p.connected,
      })),
    };
  }

  // ------------------------------------------------------------ pesan masuk
  onMessage(ws, data) {
    if (typeof data !== 'string' || data.length > 4000) return;
    if (data === 'ping') {
      try {
        ws.send('pong');
      } catch {
        /* socket tertutup */
      }
      return;
    }
    let m;
    try {
      m = JSON.parse(data);
    } catch {
      return;
    }
    if (!m || typeof m.type !== 'string') return;

    try {
      if (m.type === 'join') return this.onJoin(ws, m);
      const p = this.current(ws);
      if (!p) return;
      switch (m.type) {
        case 'leave':
          return this.removePlayer(p.id);
        case 'update_settings':
          return this.onSettings(p, m);
        case 'start':
          return this.onStart(p);
        case 'ready':
          return this.onReady(p);
        case 'target':
          return this.onTarget(p, m);
        case 'word':
        case 'skip':
          return this.onWord(p, m);
        case 'chat':
          return this.onChat(p, m);
        default:
      }
    } catch (err) {
      console.log('room error', err && err.stack ? err.stack : err);
    }
  }

  onJoin(ws, m) {
    const u = ws.user;
    const existing = this.players.get(u.id);

    // Sambung ulang (refresh halaman / koneksi putus)
    if (existing && !existing.left) {
      const old = existing.ws;
      existing.ws = ws;
      existing.connected = true;
      clearTimeout(existing.graceTimer);
      if (old && old !== ws) {
        try {
          old.close(4000, 'replaced');
        } catch {
          /* sudah tertutup */
        }
      }
      this.send(ws, { type: 'joined', youId: u.id, room: this.snapshot() });
      this.send(ws, { type: 'chat_history', messages: this.chat });
      if (this.status === 'loading' || this.status === 'countdown' || this.status === 'playing') {
        this.sendGameStart(existing, true);
      }
      this.broadcastRoom();
      return;
    }
    if (existing && existing.left) {
      return this.send(ws, { type: 'error', code: 'in_game', message: 'Kamu sudah keluar dari pertandingan ini.' });
    }
    if (this.status !== 'lobby') {
      return this.send(ws, { type: 'error', code: 'in_game', message: 'Game di room ini sedang berjalan.' });
    }

    const active = this.activePlayers();
    if (active.length >= this.settings.max) {
      return this.send(ws, { type: 'error', code: 'full', message: 'Room sudah penuh.' });
    }
    const isCreator = active.length === 0 && u.id === this.hostId;
    if (this.settings.isPrivate && !isCreator) {
      if (typeof m.password !== 'string' || m.password.length === 0) {
        return this.send(ws, { type: 'error', code: 'password_required', message: 'Room ini memakai password.' });
      }
      if (m.password !== this.settings.password) {
        return this.send(ws, { type: 'error', code: 'password_wrong', message: 'Password salah.' });
      }
    }
    if (active.length === 0) this.hostId = u.id;

    this.players.set(u.id, {
      id: u.id,
      name: u.name,
      skin: u.skin,
      guest: u.guest,
      ws,
      connected: true,
      order: ++this.orderSeq,
      team: 0,
      slot: 0,
      hp: this.settings.hp,
      alive: true,
      idx: 0,
      words: 0,
      lastWordAt: 0,
      ready: false,
      targetId: null,
      left: false,
      graceTimer: null,
    });
    this.startPing();
    this.send(ws, { type: 'joined', youId: u.id, room: this.snapshot() });
    this.send(ws, { type: 'chat_history', messages: this.chat });
    this.broadcastRoom();
    this.pushLobby();
  }

  onSettings(p, m) {
    if (p.id !== this.hostId || this.status !== 'lobby') return;
    const res = sanitizeSettings(m.settings, this.settings, p.name);
    if (!res.ok) return this.send(p.ws, { type: 'error', code: 'settings', message: res.error });
    if (res.settings.max < this.activePlayers().length) {
      return this.send(p.ws, {
        type: 'error',
        code: 'settings',
        message: 'Batas pemain lebih kecil dari jumlah pemain yang sudah masuk.',
      });
    }
    this.settings = res.settings;
    this.send(p.ws, { type: 'settings_saved' });
    this.broadcastRoom();
    this.pushLobby();
  }

  onStart(p) {
    if (p.id !== this.hostId || this.status !== 'lobby') return;
    const ready = this.activePlayers().filter((x) => x.connected);
    if (ready.length < 2) {
      return this.send(p.ws, { type: 'error', code: 'min_players', message: 'Minimal 2 pemain untuk mulai.' });
    }
    this.begin();
  }

  onReady(p) {
    if (this.status !== 'loading') return;
    p.ready = true;
    const run = this.runId;
    if (this.activePlayers().every((x) => x.ready)) this.startCountdown(run);
  }

  /** Chat room: sama di lobi dan saat pertandingan. Dibersihkan di server, disiarkan ke semua pemain. */
  onChat(p, m) {
    const text = String(m.text ?? '')
      .replace(/[\u0000-\u001f\u007f]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, CHAT_MAX_LEN);
    if (!text) return;
    const now = Date.now();
    if (now - (p.lastChatAt || 0) < CHAT_GAP_MS) return;
    p.lastChatAt = now;
    const msg = { type: 'chat', id: ++this.chatSeq, from: p.id, name: p.name, text, ts: now };
    this.chat.push(msg);
    if (this.chat.length > CHAT_KEEP) this.chat.shift();
    this.broadcast(msg);
  }

  onTarget(p, m) {
    if (this.status !== 'playing' || !p.alive) return;
    const e = this.players.get(String(m.id));
    if (e && !e.left && e.alive && e.team !== p.team) {
      p.targetId = e.id;
      this.send(p.ws, { type: 'target', id: e.id });
    }
  }

  onWord(p, m) {
    if (this.status !== 'playing' || !p.alive || p.left) return;
    if (m.i !== p.idx || p.idx >= this.words.length) {
      return this.send(p.ws, { type: 'sync', idx: p.idx });
    }
    const now = Date.now();
    if (now - p.lastWordAt < MIN_WORD_GAP_MS) {
      return this.send(p.ws, { type: 'sync', idx: p.idx });
    }
    p.lastWordAt = now;
    const correct = m.type === 'word' && String(m.w) === this.words[p.idx];
    p.idx++;
    if (correct) {
      p.words++;
      this.attack(p);
    }
    if (p.idx >= this.words.length) this.requestMoreWords(p);
  }

  // ------------------------------------------------------------ keluar / putus
  onClose(ws) {
    const id = ws.user && ws.user.id;
    const p = id && this.players.get(id);
    if (!p || p.ws !== ws) return;
    p.ws = null;
    p.connected = false;
    clearTimeout(p.graceTimer);
    p.graceTimer = setTimeout(() => this.removePlayer(id), GRACE_MS);
    this.broadcastRoom();
  }

  removePlayer(id) {
    const p = this.players.get(id);
    if (!p || p.left) return;
    clearTimeout(p.graceTimer);
    const ws = p.ws;
    p.ws = null;
    p.connected = false;

    const inGame = this.status === 'loading' || this.status === 'countdown' || this.status === 'playing';
    if (inGame) {
      p.left = true;
      p.alive = false;
      p.hp = 0;
    } else {
      this.players.delete(id);
    }
    if (ws) {
      try {
        ws.close(1000, 'bye');
      } catch {
        /* sudah tertutup */
      }
    }

    const active = this.activePlayers();
    if (active.length === 0) return this.destroyRoom();
    if (this.hostId === id) this.hostId = active[0].id;

    if (inGame) {
      this.broadcast({ type: 'out', id });
      this.broadcastRoom();
      this.checkWin();
    } else {
      this.broadcastRoom();
    }
    this.pushLobby();
  }

  destroyRoom() {
    this.runId++;
    clearTimeout(this.readyTimer);
    clearTimeout(this.resetTimer);
    clearInterval(this.pingTimer);
    for (const p of this.players.values()) clearTimeout(p.graceTimer);
    const code = this.code;
    this.resetAll();
    this.callLobby({ code, info: null });
  }

  // ------------------------------------------------------------ alur game
  async begin() {
    const run = ++this.runId;
    this.status = 'loading';
    this.broadcastRoom();
    this.pushLobby();

    const order = shuffle(this.activePlayers());
    order.forEach((p, i) => {
      p.team = (i % 2) + 1;
      p.hp = this.settings.hp;
      p.alive = true;
      p.idx = 0;
      p.words = 0;
      p.ready = false;
      p.targetId = null;
      p.lastWordAt = 0;
    });
    for (const t of [1, 2]) order.filter((p) => p.team === t).forEach((p, i) => (p.slot = i));

    const { words } = await generateWords(this.env, this.settings.maxWords);
    if (run !== this.runId || this.status !== 'loading') return;
    this.words = words;
    this.refilling = false;
    for (const p of this.activePlayers()) this.sendGameStart(p, false);
    this.readyTimer = setTimeout(() => this.startCountdown(run), READY_TIMEOUT_MS);
  }

  gamePlayers() {
    return this.allPlayers().map((p) => ({
      id: p.id,
      name: p.name,
      skin: p.skin,
      team: p.team,
      slot: p.slot,
      hp: p.hp,
      alive: p.alive,
      left: p.left,
    }));
  }

  sendGameStart(p, resume) {
    const target = this.status === 'playing' && p.alive ? this.resolveTarget(p) : null;
    this.send(p.ws, {
      type: 'game_start',
      resume,
      phase: this.status,
      words: this.words,
      idx: p.idx,
      settings: { damage: this.settings.damage, hp: this.settings.hp },
      youId: p.id,
      targetId: target ? target.id : null,
      players: this.gamePlayers(),
    });
  }

  async startCountdown(run) {
    if (run !== this.runId || this.status !== 'loading') return;
    clearTimeout(this.readyTimer);
    for (const p of this.activePlayers()) if (!p.ready) this.removePlayer(p.id);
    if (run !== this.runId || this.status !== 'loading') return;

    this.status = 'countdown';
    this.pushLobby();
    for (let n = COUNTDOWN_FROM; n >= 1; n--) {
      this.broadcast({ type: 'countdown', n });
      await sleep(1000);
      if (run !== this.runId || this.status !== 'countdown') return;
    }
    this.status = 'playing';
    this.broadcast({ type: 'go' });
  }

  resolveTarget(p) {
    const enemies = this.activePlayers().filter((e) => e.team !== p.team && e.alive);
    if (enemies.length === 0) return null;
    let t = p.targetId ? enemies.find((e) => e.id === p.targetId) : null;
    if (!t) {
      // default: musuh yang berhadapan (slot sama), jika tidak ada ambil yang masih hidup
      enemies.sort((a, b) => a.slot - b.slot);
      t = enemies.find((e) => e.slot === p.slot) || enemies[p.slot % enemies.length];
      if (p.targetId !== t.id) {
        p.targetId = t.id;
        this.send(p.ws, { type: 'target', id: t.id });
      }
    }
    return t;
  }

  attack(p) {
    const t = this.resolveTarget(p);
    if (!t) return;
    t.hp = Math.max(0, t.hp - this.settings.damage);
    if (t.hp === 0) t.alive = false;
    this.broadcast({ type: 'hit', from: p.id, to: t.id, dmg: this.settings.damage, hp: t.hp, alive: t.alive });
    if (!t.alive) this.checkWin();
  }

  requestMoreWords(p) {
    this.send(p.ws, { type: 'wait_words', seconds: REFILL_WAIT_MS / 1000 });
    if (this.refilling) return;
    this.refilling = true;
    const run = this.runId;
    setTimeout(async () => {
      const { words } = await generateWords(this.env, this.settings.maxWords);
      if (run !== this.runId || this.status !== 'playing') return;
      if (this.words.length < MAX_TOTAL_WORDS) this.words.push(...words);
      this.refilling = false;
      this.broadcast({ type: 'words_append', words });
    }, REFILL_WAIT_MS);
  }

  checkWin() {
    if (this.status === 'loading' || this.status === 'countdown') {
      const act = this.activePlayers();
      if (!act.some((p) => p.team === 1) || !act.some((p) => p.team === 2)) {
        this.abortToLobby('Ada pemain yang keluar sebelum game dimulai.');
      }
      return;
    }
    if (this.status !== 'playing') return;
    const act = this.activePlayers();
    const alive1 = act.some((p) => p.team === 1 && p.alive);
    const alive2 = act.some((p) => p.team === 2 && p.alive);
    if (alive1 && alive2) return;
    this.endGame(alive1 ? 1 : alive2 ? 2 : null);
  }

  abortToLobby(message) {
    this.runId++;
    clearTimeout(this.readyTimer);
    this.status = 'lobby';
    for (const [id, p] of [...this.players]) {
      if (p.left) this.players.delete(id);
      else this.resetPlayer(p);
    }
    const act = this.activePlayers();
    if (act.length === 0) return this.destroyRoom();
    if (!act.some((p) => p.id === this.hostId)) this.hostId = act[0].id;
    this.broadcast({ type: 'aborted', message });
    this.broadcastRoom();
    this.pushLobby();
  }

  resetPlayer(p) {
    p.team = 0;
    p.slot = 0;
    p.hp = this.settings.hp;
    p.alive = true;
    p.idx = 0;
    p.words = 0;
    p.ready = false;
    p.targetId = null;
  }

  endGame(winner) {
    if (this.status !== 'playing') return;
    this.status = 'finished';
    this.runId++;

    const mvp = {};
    for (const t of [1, 2]) {
      let best = 0;
      for (const p of this.activePlayers()) {
        if (p.team === t && p.words > best) {
          best = p.words;
          mvp[t] = p.id;
        }
      }
    }
    const results = this.allPlayers().map((p) => {
      const won = winner !== null && p.team === winner;
      const rewarded = !p.left && !p.guest && winner !== null;
      return {
        id: p.id,
        name: p.name,
        skin: p.skin,
        team: p.team,
        words: p.words,
        isMvp: mvp[p.team] === p.id,
        won,
        left: p.left,
        guest: p.guest,
        coins: rewarded ? (won ? COINS_WIN : COINS_LOSE) : 0,
      };
    });
    this.broadcast({ type: 'end', winnerTeam: winner, players: results });
    this.postResult(winner, results).catch((e) => console.log('postResult gagal', e && e.message));
    this.pushLobby();
    this.resetTimer = setTimeout(() => this.resetToLobby(), RESET_AFTER_END_MS);
  }

  resetToLobby() {
    if (this.status !== 'finished') return;
    this.status = 'lobby';
    for (const [id, p] of [...this.players]) {
      if (p.left) this.players.delete(id);
      else this.resetPlayer(p);
    }
    const act = this.activePlayers();
    if (act.length === 0) return this.destroyRoom();
    if (!act.some((p) => p.id === this.hostId)) this.hostId = act[0].id;
    this.broadcastRoom();
    this.pushLobby();
  }

  async postResult(winner, results) {
    if (!this.env.API_URL || winner === null) return;
    const players = results
      .filter((r) => !r.guest && !r.left)
      .map((r) => ({ userId: r.id, team: r.team, words: r.words, isMvp: r.isMvp, won: r.won, coins: r.coins }));
    if (players.length === 0) return;
    const body = JSON.stringify({
      matchId: crypto.randomUUID(),
      roomName: this.settings.name,
      winnerTeam: winner,
      playerCount: results.length,
      players,
    });
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const res = await fetch(`${this.env.API_URL.replace(/\/$/, '')}/api/internal/match`, {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'x-game-secret': this.env.GAME_SERVER_SECRET || '' },
          body,
        });
        if (res.ok) return;
        console.log('API match status', res.status);
      } catch (e) {
        console.log('API match error', e && e.message);
      }
      await sleep(1500 * (attempt + 1));
    }
  }

  // ------------------------------------------------------------ daftar room di Lobby
  startPing() {
    if (this.pingTimer) return;
    this.pingTimer = setInterval(() => {
      if (this.activePlayers().length === 0) {
        clearInterval(this.pingTimer);
        this.pingTimer = null;
        return;
      }
      this.pushLobby();
    }, LOBBY_PING_MS);
  }

  pushLobby() {
    if (!this.inited) return;
    this.callLobby({
      code: this.code,
      info: {
        name: this.settings.name,
        isPrivate: this.settings.isPrivate,
        players: this.activePlayers().length,
        max: this.settings.max,
        status: this.status === 'lobby' ? 'lobby' : 'playing',
      },
    });
  }

  callLobby(body) {
    try {
      const stub = this.env.LOBBY.get(this.env.LOBBY.idFromName('main'));
      stub
        .fetch('https://lobby/room-update', { method: 'POST', body: JSON.stringify(body) })
        .catch(() => {});
    } catch {
      /* abaikan */
    }
  }
}
