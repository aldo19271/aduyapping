import { createContext, useContext, useEffect, useMemo, useReducer, useRef } from 'react';
import { Net } from './lib/net.js';
import { api, tokenStore } from './lib/api.js';

const Ctx = createContext(null);
export const useApp = () => useContext(Ctx);

const initial = {
  booted: false,
  user: null, // akun login (dari API) atau null jika guest
  me: null, // identitas di server game (termasuk nama guest)
  conn: 'connecting',
  rooms: [],
  screen: 'landing',
  room: null,
  youId: null,
  game: null,
  toast: null,
  busy: false,
  passwordPrompt: null,
  startSeq: 0,
  chat: { messages: [], unread: 0, open: false },
};

const EMPTY_CHAT = { messages: [], unread: 0, open: false };

function gameReducer(s, m) {
  const g = s.game;
  switch (m.type) {
    case 'game_start': {
      const players = {};
      for (const p of m.players) players[p.id] = { ...p, hits: 0 };
      return {
        ...s,
        screen: 'game',
        startSeq: s.startSeq + 1,
        game: {
          phase: m.phase === 'playing' ? 'playing' : m.phase === 'countdown' ? 'countdown' : 'loading',
          words: m.words,
          idx: m.idx,
          players,
          order: m.players.map((p) => p.id),
          youId: m.youId,
          targetId: m.targetId || null,
          countdown: null,
          waiting: false,
          damage: m.settings.damage,
          maxHp: m.settings.hp,
          result: null,
          lastHit: null,
          hitSeq: 0,
        },
      };
    }
    case 'countdown':
      return g ? { ...s, game: { ...g, phase: 'countdown', countdown: m.n } } : s;
    case 'go':
      return g ? { ...s, game: { ...g, phase: 'playing', countdown: null } } : s;
    case 'hit': {
      const p = g && g.players[m.to];
      if (!p) return s;
      const hitSeq = g.hitSeq + 1;
      return {
        ...s,
        game: {
          ...g,
          hitSeq,
          lastHit: { seq: hitSeq, to: m.to, from: m.from, dmg: m.dmg },
          players: { ...g.players, [m.to]: { ...p, hp: m.hp, alive: m.alive, hits: p.hits + 1 } },
        },
      };
    }
    case 'out': {
      const p = g && g.players[m.id];
      if (!p) return s;
      return { ...s, game: { ...g, players: { ...g.players, [m.id]: { ...p, hp: 0, alive: false, left: true } } } };
    }
    case 'target':
      return g ? { ...s, game: { ...g, targetId: m.id } } : s;
    case 'sync':
      return g ? { ...s, game: { ...g, idx: m.idx } } : s;
    case 'wait_words':
      return g ? { ...s, game: { ...g, waiting: true } } : s;
    case 'words_append':
      return g ? { ...s, game: { ...g, words: g.words.concat(m.words), waiting: false } } : s;
    case 'end':
      return g ? { ...s, game: { ...g, phase: 'ended', result: m } } : s;
    default:
      return s;
  }
}

function reducer(s, a) {
  switch (a.type) {
    case 'booted':
      return { ...s, booted: true, screen: a.screen || s.screen };
    case 'user':
      return { ...s, user: a.user && s.user ? { ...s.user, ...a.user } : a.user };
    case 'screen':
      return { ...s, screen: a.screen };
    case 'conn':
      return { ...s, conn: a.status };
    case 'hello':
      return { ...s, me: a.user };
    case 'rooms':
      return { ...s, rooms: a.rooms };
    case 'toast':
      return { ...s, toast: { id: Math.random(), text: a.text } };
    case 'busy':
      return { ...s, busy: a.busy };
    case 'password_prompt':
      return { ...s, passwordPrompt: a.prompt, busy: false };
    case 'joined':
      return { ...s, room: a.room, youId: a.youId, screen: 'room', busy: false, game: null, passwordPrompt: null, chat: EMPTY_CHAT };
    case 'room':
      return s.room ? { ...s, room: a.room } : s;
    case 'left':
      return { ...s, room: null, game: null, busy: false, chat: EMPTY_CHAT, screen: s.screen === 'landing' ? 'landing' : 'join' };
    case 'aborted':
      return { ...s, game: null, screen: s.room ? 'room' : 'join' };
    case 'back_to_room':
      return { ...s, game: null, screen: s.room ? 'room' : 'join' };
    case 'chat_msg': {
      const c = s.chat;
      if (c.messages.some((x) => x.id === a.msg.id)) return s;
      const mine = a.msg.from === s.youId;
      return {
        ...s,
        chat: { ...c, messages: [...c.messages, a.msg].slice(-60), unread: c.open || mine ? c.unread : c.unread + 1 },
      };
    }
    case 'chat_history':
      return { ...s, chat: { ...s.chat, messages: a.messages.slice(-60), unread: 0 } };
    case 'chat_open':
      return { ...s, chat: { ...s.chat, open: a.open, unread: a.open ? 0 : s.chat.unread } };
    case 'next_word':
      return s.game ? { ...s, game: { ...s.game, idx: s.game.idx + 1 } } : s;
    case 'game_event':
      return gameReducer(s, a.msg);
    default:
      return s;
  }
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initial);
  const netRef = useRef(null);
  const pendingJoin = useRef('');

  useEffect(() => {
    const handle = (e) => {
      const net = netRef.current;
      if (!net) return;
      if (e.type === 'lobby_status') return dispatch({ type: 'conn', status: e.status });
      if (e.type === 'room_lost') {
        dispatch({ type: 'toast', text: 'Koneksi ke room terputus.' });
        return dispatch({ type: 'left' });
      }
      if (e.type === 'lobby_msg') {
        const m = e.msg;
        if (m.type === 'hello') dispatch({ type: 'hello', user: m.user });
        else if (m.type === 'rooms') dispatch({ type: 'rooms', rooms: m.rooms });
        else if (m.type === 'room_created') net.joinRoom(m.code, '');
        else if (m.type === 'error') {
          dispatch({ type: 'busy', busy: false });
          dispatch({ type: 'toast', text: m.message });
        }
        return;
      }
      if (e.type === 'room_msg') {
        const m = e.msg;
        switch (m.type) {
          case 'joined':
            return dispatch({ type: 'joined', room: m.room, youId: m.youId });
          case 'room':
            return dispatch({ type: 'room', room: m.room });
          case 'aborted':
            dispatch({ type: 'toast', text: m.message });
            return dispatch({ type: 'aborted' });
          case 'chat':
            return dispatch({ type: 'chat_msg', msg: m });
          case 'chat_history':
            return dispatch({ type: 'chat_history', messages: Array.isArray(m.messages) ? m.messages : [] });
          case 'settings_saved':
            return dispatch({ type: 'toast', text: 'Pengaturan disimpan.' });
          case 'error':
            if (m.code === 'password_required' || m.code === 'password_wrong') {
              return dispatch({
                type: 'password_prompt',
                prompt: { code: pendingJoin.current, error: m.code === 'password_wrong' ? m.message : '' },
              });
            }
            dispatch({ type: 'busy', busy: false });
            return dispatch({ type: 'toast', text: m.message });
          default:
            return dispatch({ type: 'game_event', msg: m });
        }
      }
    };

    const net = new Net(handle);
    netRef.current = net;

    (async () => {
      const token = tokenStore.get();
      if (token) {
        try {
          const r = await api.me();
          tokenStore.set(r.token);
          dispatch({ type: 'user', user: r.user });
          net.connectLobby(r.token);
          dispatch({ type: 'booted', screen: 'menu' });
          return;
        } catch (err) {
          if (err.status === 401) tokenStore.clear();
        }
      }
      net.connectLobby(null);
      dispatch({ type: 'booted', screen: 'landing' });
    })();

    return () => net.destroy();
  }, []);

  const actions = useMemo(() => {
    const net = () => netRef.current;
    const guard = () => setTimeout(() => dispatch({ type: 'busy', busy: false }), 8000);
    const applyAuth = (r) => {
      tokenStore.set(r.token);
      dispatch({ type: 'user', user: r.user });
      net().connectLobby(r.token);
      dispatch({ type: 'screen', screen: 'menu' });
    };
    return {
      go: (screen) => dispatch({ type: 'screen', screen }),
      toast: (text) => dispatch({ type: 'toast', text }),

      async login(username, password) {
        applyAuth(await api.login(username, password));
      },
      async register(username, email, password) {
        applyAuth(await api.register(username, email, password));
      },
      async updateAccount(body) {
        const r = await api.updateAccount(body);
        tokenStore.set(r.token);
        dispatch({ type: 'user', user: r.user });
        net().connectLobby(r.token);
      },
      playAsGuest: () => dispatch({ type: 'screen', screen: 'menu' }),
      logout() {
        if (net().roomCode) net().leaveRoom();
        tokenStore.clear();
        dispatch({ type: 'user', user: null });
        dispatch({ type: 'left' });
        net().connectLobby(null);
        dispatch({ type: 'screen', screen: 'landing' });
      },
      setUser: (user) => dispatch({ type: 'user', user }),
      refreshIdentity(token) {
        tokenStore.set(token);
        net().connectLobby(token);
      },

      createRoom(settings) {
        if (!net().isOnline()) return dispatch({ type: 'toast', text: 'Menghubungkan ke server, coba sebentar lagi.' });
        dispatch({ type: 'busy', busy: true });
        guard();
        net().createRoom(settings);
      },
      joinRoom(code, password = '') {
        if (!net().isOnline()) return dispatch({ type: 'toast', text: 'Menghubungkan ke server, coba sebentar lagi.' });
        pendingJoin.current = String(code).trim().toUpperCase();
        dispatch({ type: 'busy', busy: true });
        guard();
        net().joinRoom(code, password);
      },
      dismissPrompt: () => dispatch({ type: 'password_prompt', prompt: null }),
      leaveRoom() {
        net().leaveRoom();
        dispatch({ type: 'left' });
      },
      saveSettings: (settings) => net().sendRoom({ type: 'update_settings', settings }),
      startGame: () => net().sendRoom({ type: 'start' }),
      sendChat: (text) => net().sendRoom({ type: 'chat', text }),
      setChatOpen: (open) => dispatch({ type: 'chat_open', open }),
      ready: () => net().sendRoom({ type: 'ready' }),
      sendWord: (i, w) => net().sendRoom({ type: 'word', i, w }),
      sendSkip: (i) => net().sendRoom({ type: 'skip', i }),
      nextWord: () => dispatch({ type: 'next_word' }),
      setTarget(id) {
        net().sendRoom({ type: 'target', id });
        dispatch({ type: 'game_event', msg: { type: 'target', id } });
      },
      backToRoom: () => dispatch({ type: 'back_to_room' }),
    };
  }, []);

  const value = useMemo(() => ({ state, actions }), [state, actions]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
