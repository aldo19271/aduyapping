import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useAnimationControls } from 'framer-motion';
import { Coins, Crosshair, Crown, LogOut, Skull, Trophy } from 'lucide-react';
import { useApp } from '../store.jsx';
import { api } from '../lib/api.js';
import Avatar from '../components/Avatar.jsx';
import { BrokenCrown, Burst, Confetti, CountUp } from '../components/fx.jsx';
import { playSound } from '../lib/sound.js';
import { ChatButton, ChatSheet } from '../components/Chat.jsx';
import { Button, HpBar } from '../components/ui.jsx';

function PlayerCard({ p, g, enemy, isTarget, onPick }) {
  const hit = g.lastHit && g.lastHit.to === p.id ? g.lastHit : null;
  const Tag = enemy && p.alive ? motion.button : motion.div;
  return (
    <Tag
      type={enemy && p.alive ? 'button' : undefined}
      layout
      className={`pcard ${enemy ? 'enemy' : 'ally'} ${isTarget ? 'target' : ''} ${p.alive ? '' : 'dead'} ${p.id === g.youId ? 'you' : ''}`}
      onClick={enemy && p.alive ? () => onPick(p.id) : undefined}
      whileHover={enemy && p.alive ? { y: -4 } : undefined}
      whileTap={enemy && p.alive ? { scale: 0.9 } : undefined}
      initial={{ opacity: 0, y: enemy ? -24 : 24, scale: 0.8 }}
      animate={{ opacity: 1, y: 0, scale: isTarget ? 1.06 : 1 }}
      transition={{ type: 'spring', stiffness: 380, damping: 20 }}
    >
      <div className="pcard-avatar">
        <Avatar skin={p.skin} size={54} dead={!p.alive} hits={p.hits} />
        <Burst fire={p.alive ? 0 : 1} count={12} radius={56} />
        <AnimatePresence>
          {hit ? (
            <motion.span
              key={hit.seq}
              className="float-dmg"
              initial={{ y: 0, opacity: 1, scale: 0.6 }}
              animate={{ y: -38, opacity: 0, scale: 1.3 }}
              transition={{ duration: 0.8 }}
            >
              -{hit.dmg}
            </motion.span>
          ) : null}
        </AnimatePresence>
        {isTarget ? (
          <motion.span
            className="crosshair"
            initial={{ scale: 2, opacity: 0, rotate: -90 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 500, damping: 20 }}
          >
            <motion.span animate={{ rotate: 360 }} transition={{ duration: 6, repeat: Infinity, ease: 'linear' }} style={{ display: 'grid' }}>
              <Crosshair size={18} strokeWidth={2.5} />
            </motion.span>
          </motion.span>
        ) : null}
      </div>
      <span className="pcard-name">{p.id === g.youId ? 'Kamu' : p.name}</span>
      <HpBar hp={p.hp} max={g.maxHp} tone={enemy ? 'enemy' : 'ally'} />
      <small className="pcard-hp">{p.left ? 'keluar' : p.hp}</small>
    </Tag>
  );
}

function Result({ g, onBack, user }) {
  const r = g.result;
  const me = r.players.find((p) => p.id === g.youId);
  const myTeam = me ? me.team : 0;
  const won = r.winnerTeam !== null && r.winnerTeam === myTeam;
  const rows = (team) => r.players.filter((p) => p.team === team);

  useEffect(() => {
    playSound(won ? 'win' : 'lose');
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <motion.div className="result" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      {won ? <Confetti /> : null}
      <motion.div
        className={`result-card ${won ? '' : 'sombre'}`}
        initial={{ y: 60, scale: 0.9, opacity: 0, rotate: -2 }}
        animate={{ y: 0, scale: 1, opacity: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 280, damping: 18 }}
      >
        {won ? (
          <motion.div
            className="trophy"
            initial={{ scale: 0, rotate: -40 }}
            animate={{ scale: 1, rotate: 0, y: [0, -8, 0] }}
            transition={{ scale: { type: 'spring', stiffness: 300, damping: 12, delay: 0.2 }, y: { duration: 1.6, repeat: Infinity, delay: 0.8 } }}
          >
            <Trophy size={44} strokeWidth={2.5} />
          </motion.div>
        ) : (
          <motion.div
            className="trophy fallen"
            initial={{ scale: 0, y: -30 }}
            animate={{ scale: 1, y: 0, rotate: [0, -4, 4, 0] }}
            transition={{ scale: { type: 'spring', stiffness: 260, damping: 14, delay: 0.2 }, rotate: { duration: 3, repeat: Infinity, delay: 1 } }}
          >
            <Skull size={44} strokeWidth={2.5} />
          </motion.div>
        )}
        <motion.h2
          className={won ? 'win' : 'lose'}
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 400, damping: 14, delay: 0.15 }}
        >
          {r.winnerTeam === null ? 'Seri' : won ? 'Tim kamu menang' : 'Tim kamu kalah'}
        </motion.h2>
        {[myTeam, myTeam === 1 ? 2 : 1].map((team) => {
          const lost = r.winnerTeam !== null && r.winnerTeam !== team;
          return (
            <div className={`result-team ${lost ? 'lost' : ''}`} key={team}>
              <h4>
                {team === myTeam ? 'Tim kamu' : 'Tim lawan'}
                {r.winnerTeam === team ? ' - menang' : lost ? ' - gugur' : ''}
              </h4>
              {rows(team).map((p, i) => (
                <motion.div
                  key={p.id}
                  className={`result-row ${lost ? 'fallen' : ''}`}
                  initial={{ opacity: 0, x: -30 }}
                  animate={{ opacity: 1, x: 0 }}
                  whileHover={{ x: 4 }}
                  transition={{ type: 'spring', stiffness: 360, damping: 22, delay: 0.3 + i * 0.09 }}
                >
                  <Avatar skin={p.skin} size={34} bob={false} plate={false} dead={lost} />
                  <span className="result-name">
                    {p.id === g.youId ? 'Kamu' : p.name}
                    {p.left ? <small> (keluar)</small> : null}
                  </span>
                  {p.isMvp ? (
                    lost ? (
                      <motion.span
                        className="badge fallen"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.7 + i * 0.09, type: 'spring', stiffness: 400, damping: 14 }}
                      >
                        <BrokenCrown size={14} delay={1.1 + i * 0.09} /> MVP
                      </motion.span>
                    ) : (
                      <motion.span
                        className="badge"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1, rotate: [0, -8, 8, 0] }}
                        transition={{ delay: 0.8 + i * 0.09, type: 'spring', stiffness: 400, damping: 12 }}
                      >
                        <Crown size={13} strokeWidth={2.5} /> MVP
                      </motion.span>
                    )
                  ) : null}
                  <span className="result-words">
                    <CountUp value={p.words} /> kata
                  </span>
                  {p.coins > 0 ? (
                    <motion.span
                      className="result-coins"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 1 + i * 0.09, type: 'spring', stiffness: 500, damping: 12 }}
                    >
                      <Coins size={14} strokeWidth={2.5} /> +{p.coins}
                    </motion.span>
                  ) : null}
                </motion.div>
              ))}
            </div>
          );
        })}
        {!user ? <p className="note center-text">Guest tidak mendapat koin dan tidak masuk leaderboard.</p> : null}
        <Button onClick={onBack}>Kembali ke room</Button>
      </motion.div>
    </motion.div>
  );
}

export default function Game() {
  const { state, actions } = useApp();
  const g = state.game;
  const inputRef = useRef(null);
  const idxRef = useRef(0);
  const [typed, setTyped] = useState('');
  const [flash, setFlash] = useState(0);
  const [combo, setCombo] = useState(0);
  const [flies, setFlies] = useState([]);
  const [hurt, setHurt] = useState(0);
  const shake = useAnimationControls();
  const boxCtl = useAnimationControls();

  // sinkron index dari server / state
  useEffect(() => {
    if (g) idxRef.current = g.idx;
  }, [g && g.idx, state.startSeq]); // eslint-disable-line react-hooks/exhaustive-deps

  // beri tahu server bahwa halaman game sudah siap
  useEffect(() => {
    if (g && g.phase === 'loading') actions.ready();
  }, [state.startSeq]); // eslint-disable-line react-hooks/exhaustive-deps

  // fokus ke kolom ketik saat mulai
  useEffect(() => {
    if (g && g.phase === 'playing' && inputRef.current && !state.chat.open) inputRef.current.focus();
  }, [g && g.phase]); // eslint-disable-line react-hooks/exhaustive-deps

  // layar bergetar + kilau merah + getar HP saat kamu kena serang
  useEffect(() => {
    if (g && g.lastHit && g.lastHit.to === g.youId) {
      setHurt(g.hitSeq);
      shake.start({ x: [0, -9, 9, -6, 6, 0], transition: { duration: 0.35 } });
      try {
        if (navigator.vibrate) navigator.vibrate(35);
      } catch {
        /* tidak didukung */
      }
    }
  }, [g && g.hitSeq]); // eslint-disable-line react-hooks/exhaustive-deps

  // suara saat KAMU menyerang
  useEffect(() => {
    if (g && g.lastHit && g.lastHit.from === g.youId) playSound('attack');
  }, [g && g.hitSeq]); // eslint-disable-line react-hooks/exhaustive-deps

  // segarkan koin setelah hasil dicatat server
  const ended = !!(g && g.result);
  useEffect(() => {
    if (!ended || !state.user) return undefined;
    const t = setTimeout(() => {
      api
        .me()
        .then((r) => actions.setUser(r.user))
        .catch(() => {});
    }, 2200);
    return () => clearTimeout(t);
  }, [ended]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!g) return null;
  const me = g.players[g.youId];
  const myTeam = me ? me.team : 1;
  const allies = g.order.map((id) => g.players[id]).filter((p) => p.team === myTeam);
  const enemies = g.order.map((id) => g.players[id]).filter((p) => p.team !== myTeam);

  const alive = !!(me && me.alive);
  const playing = g.phase === 'playing' && alive;
  const word = g.words[g.idx];
  const upcoming = g.words.slice(g.idx + 1, g.idx + 5);
  const bad = typed.length > 0 && word && !word.startsWith(typed);

  const pushFly = (w) => {
    const id = Math.random();
    setFlies((l) => [...l.slice(-4), { id, w }]);
    setTimeout(() => setFlies((l) => l.filter((f) => f.id !== id)), 850);
  };

  const submit = (value) => {
    const idx = idxRef.current;
    if (idx >= g.words.length) return;
    if (value === g.words[idx]) {
      actions.sendWord(idx, value);
      setCombo((c) => c + 1);
      pushFly(value);
    } else {
      actions.sendSkip(idx);
      setCombo(0);
      setFlash((n) => n + 1);
    }
    idxRef.current = idx + 1;
    actions.nextWord();
  };

  const onChange = (e) => {
    if (!playing) return;
    const raw = e.target.value.toLowerCase().replace(/[^a-z ]/g, '');
    if (raw.includes(' ')) {
      const w = raw.split(' ')[0];
      setTyped('');
      if (w.length > 0) submit(w);
      return;
    }
    setTyped(raw);
    const wrong = raw.length > 0 && word && !word.startsWith(raw);
    if (wrong) boxCtl.start({ x: [0, -5, 5, -3, 0], transition: { duration: 0.18 } });
    else boxCtl.start({ scale: [1, 1.025, 1], transition: { duration: 0.1 } });
  };

  const leave = () => actions.leaveRoom();

  return (
    <>
    {hurt > 0 ? (
      <motion.div
        key={hurt}
        className="hurt"
        initial={{ opacity: 0.55 }}
        animate={{ opacity: 0 }}
        transition={{ duration: 0.5 }}
      />
    ) : null}
    <motion.main
      className="screen game"
      animate={shake}
      onClick={() => inputRef.current && playing && !state.chat.open && inputRef.current.focus()}
    >

      <div className="game-top">
        <span className="chip">Tim lawan</span>
        {combo >= 3 ? (
          <motion.span
            key={combo}
            className="combo"
            initial={{ scale: 1.9, rotate: -10, opacity: 0 }}
            animate={{ scale: 1, rotate: 0, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 520, damping: 16 }}
          >
            x{combo} combo
          </motion.span>
        ) : (
          <span />
        )}
        <button type="button" className="link" onClick={leave}>
          <LogOut size={15} strokeWidth={2.5} /> Keluar
        </button>
      </div>

      <div className="team-row">
        {enemies.map((p) => (
          <PlayerCard
            key={p.id}
            p={p}
            g={g}
            enemy
            isTarget={g.targetId === p.id}
            onPick={(id) => playing && actions.setTarget(id)}
          />
        ))}
      </div>

      <div className="arena">
        <AnimatePresence mode="wait">
          {g.phase === 'loading' ? (
            <motion.p key="load" className="arena-msg" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              Menyiapkan kata dari AI
              <span className="dots" aria-hidden="true">
                <i />
                <i />
                <i />
              </span>
            </motion.p>
          ) : g.phase === 'countdown' ? (
            <motion.div
              key={`cd-${g.countdown}`}
              className="countdown"
              initial={{ scale: 2.4, opacity: 0, rotate: -12 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              exit={{ scale: 0.5, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 420, damping: 20 }}
            >
              <motion.span
                className="ring"
                initial={{ scale: 0.7, opacity: 0.9 }}
                animate={{ scale: 2.4, opacity: 0 }}
                transition={{ duration: 0.95, ease: 'easeOut' }}
              />
              {g.countdown || ''}
            </motion.div>
          ) : !alive && g.phase !== 'ended' ? (
            <motion.p key="dead" className="arena-msg" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              Kamu sudah jatuh. Tonton pertandingan sampai selesai.
            </motion.p>
          ) : word === undefined || g.waiting ? (
            <motion.p key="wait" className="arena-msg" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              Kata habis. Menunggu kata baru (5 detik)
              <span className="dots" aria-hidden="true">
                <i />
                <i />
                <i />
              </span>
            </motion.p>
          ) : (
            <motion.div key="words" className="words" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <motion.div
                key={`${g.idx}-${flash}`}
                className={`word-current ${bad ? 'bad' : ''}`}
                initial={{ y: 18, opacity: 0, scale: 0.9 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                transition={{ type: 'spring', stiffness: 600, damping: 26 }}
              >
                {word.split('').map((ch, i) => (
                  <span key={i} className={i < typed.length ? (typed[i] === ch ? 'ok' : 'err') : ''}>
                    {ch}
                  </span>
                ))}
              </motion.div>
              <div className="word-next">
                {upcoming.map((w, i) => (
                  <motion.span
                    key={`${g.idx}-${i}`}
                    initial={{ opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 }}
                  >
                    {w}
                  </motion.span>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <div className="flies" aria-hidden="true">
          {flies.map((f) => (
            <motion.span
              key={f.id}
              className="fly"
              initial={{ y: 40, opacity: 1, scale: 1 }}
              animate={{ y: -110, opacity: 0, scale: 1.4 }}
              transition={{ duration: 0.75, ease: 'easeOut' }}
            >
              {f.w}
            </motion.span>
          ))}
        </div>
      </div>

      <div className="team-row">
        {allies.map((p) => (
          <PlayerCard key={p.id} p={p} g={g} enemy={false} isTarget={false} />
        ))}
      </div>
      <div className="game-top">
        <span className="chip">Tim kamu</span>
        <ChatButton variant="icon" />
      </div>

      <motion.div className={`typebox ${bad ? 'bad' : ''}`} animate={boxCtl}>
        <input
          ref={inputRef}
          value={typed}
          onChange={onChange}
          disabled={!playing}
          placeholder={playing ? 'ketik kata lalu spasi' : ''}
          inputMode="text"
          enterKeyHint="send"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="none"
          spellCheck={false}
          aria-label="Ketik kata"
        />
      </motion.div>

    </motion.main>
    <ChatSheet title="Chat" />
    {g.result ? <Result g={g} user={state.user} onBack={actions.backToRoom} /> : null}
    </>
  );
}
