import { DurableObject } from 'cloudflare:workers';
import { signToken, verifyToken } from './jwt.js';
import { sanitizeSettings, DEFAULT_SKIN } from './settings.js';

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const STALE_MS = 90_000; // room tanpa kabar lebih dari ini dianggap mati
const MAX_ROOMS = 300;
const TICKET_TTL = 6 * 3600;

function json(obj) {
  return JSON.stringify(obj);
}

/**
 * Lobby: satu instance global.
 * - menjaga nomor guest agar tidak kembar
 * - menyimpan daftar room yang aktif dan menyiarkannya ke semua pemain
 * - membuat room baru (kode unik)
 * Memakai WebSocket Hibernation, jadi tidak memakan kuota saat sepi.
 */
export class Lobby extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair('ping', 'pong'));
  }

  async loadRooms() {
    const rooms = (await this.ctx.storage.get('rooms')) || {};
    const now = Date.now();
    let dirty = false;
    for (const code of Object.keys(rooms)) {
      if (now - rooms[code].updatedAt > STALE_MS) {
        delete rooms[code];
        dirty = true;
      }
    }
    if (dirty) await this.ctx.storage.put('rooms', rooms);
    return rooms;
  }

  publicList(rooms) {
    return Object.values(rooms)
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .map((r) => ({
        code: r.code,
        name: r.name,
        isPrivate: r.isPrivate,
        players: r.players,
        max: r.max,
        status: r.status,
        spec: !!r.spec,
      }));
  }

  broadcastRooms(rooms) {
    const msg = json({ type: 'rooms', rooms: this.publicList(rooms) });
    for (const ws of this.ctx.getWebSockets()) {
      try {
        ws.send(msg);
      } catch {
        /* socket sudah tertutup */
      }
    }
  }

  usedGuestNumbers() {
    const used = new Set();
    for (const ws of this.ctx.getWebSockets()) {
      const att = ws.deserializeAttachment();
      if (att && att.user && att.user.guestNum) used.add(att.user.guestNum);
    }
    return used;
  }

  allocateGuest() {
    const used = this.usedGuestNumbers();
    let min = 1000;
    let max = 9999;
    for (let tries = 0; ; tries++) {
      if (tries === 300) {
        min = 10000;
        max = 99999;
      }
      const n = min + Math.floor(Math.random() * (max - min + 1));
      if (!used.has(n)) {
        return {
          id: `g-${crypto.randomUUID()}`,
          name: `guest#${n}`,
          skin: DEFAULT_SKIN,
          guest: true,
          guestNum: n,
        };
      }
    }
  }

  async fetch(request) {
    const url = new URL(request.url);

    // Panggilan internal dari Room
    if (url.pathname === '/room-update' && request.method === 'POST') {
      const { code, info } = await request.json();
      const rooms = await this.loadRooms();
      const prev = rooms[code];
      let changed = true;
      if (info) {
        changed =
          !prev ||
          prev.name !== info.name ||
          prev.isPrivate !== info.isPrivate ||
          prev.players !== info.players ||
          prev.max !== info.max ||
          prev.status !== info.status ||
          prev.spec !== info.spec;
        rooms[code] = { ...info, code, updatedAt: Date.now() };
      } else {
        changed = !!prev;
        delete rooms[code];
      }
      await this.ctx.storage.put('rooms', rooms);
      if (changed) this.broadcastRooms(rooms);
      return new Response('ok');
    }

    if (request.headers.get('Upgrade') !== 'websocket') {
      return new Response('Expected websocket', { status: 426 });
    }

    // Identitas: akun login (token dari Vercel) atau guest baru
    let user = null;
    const token = url.searchParams.get('token');
    if (token) {
      const p = await verifyToken(token, this.env.JWT_SECRET);
      if (p && p.typ === 'user' && p.sub) {
        user = { id: p.sub, name: String(p.name || 'pemain'), skin: p.skin || DEFAULT_SKIN, guest: false };
      }
    }
    if (!user) user = this.allocateGuest();

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    this.ctx.acceptWebSocket(server);
    server.serializeAttachment({ user });

    const ticket = await signToken(
      { sub: user.id, name: user.name, skin: user.skin, guest: user.guest, typ: 'ticket' },
      this.env.JWT_SECRET,
      TICKET_TTL,
    );
    const publicUser = { id: user.id, name: user.name, skin: user.skin, guest: user.guest };
    server.send(json({ type: 'hello', user: publicUser, ticket }));
    server.send(json({ type: 'rooms', rooms: this.publicList(await this.loadRooms()) }));

    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws, message) {
    if (typeof message !== 'string') return;
    let m;
    try {
      m = JSON.parse(message);
    } catch {
      return;
    }
    const att = ws.deserializeAttachment();
    const user = att && att.user;
    if (!user) return;

    if (m.type === 'list') {
      ws.send(json({ type: 'rooms', rooms: this.publicList(await this.loadRooms()) }));
      return;
    }

    if (m.type === 'create_room') {
      const res = sanitizeSettings(m.settings, null, user.name);
      if (!res.ok) {
        ws.send(json({ type: 'error', message: res.error }));
        return;
      }
      const rooms = await this.loadRooms();
      if (Object.keys(rooms).length >= MAX_ROOMS) {
        ws.send(json({ type: 'error', message: 'Server penuh, coba lagi nanti.' }));
        return;
      }
      let code = '';
      do {
        code = Array.from({ length: 5 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join('');
      } while (rooms[code]);

      const stub = this.env.ROOM.get(this.env.ROOM.idFromName(code));
      const r = await stub.fetch('https://room/init', {
        method: 'POST',
        body: json({
          code,
          settings: res.settings,
          host: { id: user.id, name: user.name, skin: user.skin, guest: user.guest },
        }),
      });
      if (!r.ok) {
        ws.send(json({ type: 'error', message: 'Gagal membuat room.' }));
        return;
      }
      rooms[code] = {
        code,
        name: res.settings.name,
        isPrivate: res.settings.isPrivate,
        players: 0,
        max: res.settings.max,
        status: 'lobby',
        spec: res.settings.specOn,
        updatedAt: Date.now(),
      };
      await this.ctx.storage.put('rooms', rooms);
      this.broadcastRooms(rooms);
      ws.send(json({ type: 'room_created', code }));
    }
  }

  async webSocketClose(ws, code) {
    try {
      ws.close(code && code !== 1005 && code !== 1006 ? code : 1000, 'closing');
    } catch {
      /* sudah tertutup */
    }
  }

  async webSocketError(ws) {
    try {
      ws.close(1011, 'error');
    } catch {
      /* sudah tertutup */
    }
  }
}
