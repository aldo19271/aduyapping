import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronRight, Crown } from 'lucide-react';
import { useApp } from '../store.jsx';
import { api } from '../lib/api.js';
import { CountUp, useRipple } from '../components/fx.jsx';
import ProfileModal from '../components/ProfileModal.jsx';
import { Screen, Tabs, TopBar, itemVariants, listVariants } from '../components/ui.jsx';

function Row({ r, i, max, me, onOpen }) {
  const [down, ripples] = useRipple();
  return (
    <motion.li
      variants={itemVariants}
      whileHover={{ x: 6 }}
      whileTap={{ scale: 0.97 }}
      role="button"
      tabIndex={0}
      onPointerDown={down}
      onClick={onOpen}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onOpen()}
      className={`board-row tappable ${i < 3 ? `top top-${i + 1}` : ''} ${me ? 'me' : ''}`}
    >
      {ripples}
      <motion.span
        className="board-bar"
        initial={{ scaleX: 0 }}
        animate={{ scaleX: r.value / max }}
        transition={{ delay: 0.25 + i * 0.05, duration: 0.8, ease: 'easeOut' }}
      />
      <span className="rank">{i + 1}</span>
      <span className="board-name">
        {r.name}
        {i === 0 ? (
          <motion.span
            className="crown"
            animate={{ rotate: [-10, 10, -10], y: [0, -3, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          >
            <Crown size={16} strokeWidth={2.5} />
          </motion.span>
        ) : null}
      </span>
      <span className="board-val">
        <CountUp value={r.value} />
      </span>
      <motion.span className="board-go" animate={{ x: [0, 4, 0] }} transition={{ duration: 1.6, repeat: Infinity }}>
        <ChevronRight size={16} strokeWidth={3} />
      </motion.span>
    </motion.li>
  );
}

export default function Leaderboard() {
  const { state, actions } = useApp();
  const [tab, setTab] = useState('wins');
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');
  const [selected, setSelected] = useState(null);

  const [reload, setReload] = useState(0);

  useEffect(() => {
    let alive = true;
    api
      .leaderboard(reload ? Date.now() : undefined)
      .then((r) => alive && setData(r))
      .catch((e) => alive && setErr(e.message));
    return () => {
      alive = false;
    };
  }, [reload]);

  const rows = data ? data[tab === 'wins' ? 'wins' : 'coins'] : [];
  const max = rows.reduce((m, r) => Math.max(m, r.value), 1);
  const meName = state.user ? state.user.name : '';

  return (
    <Screen>
      <TopBar title="Leaderboard" onBack={() => actions.go('menu')} />
      <Tabs
        id="lb"
        value={tab}
        onChange={setTab}
        tabs={[
          { id: 'wins', label: 'Top Global Win' },
          { id: 'coins', label: 'Top Global Koin' },
        ]}
      />
      {err ? <p className="error">{err}</p> : null}
      {!data && !err ? (
        <p className="empty">
          <span className="spin big" />
        </p>
      ) : null}
      {data && rows.length === 0 ? <p className="empty">Belum ada data. Menangkan pertandingan pertamamu.</p> : null}

      <motion.ol className="board" key={tab} variants={listVariants} initial="initial" animate="animate">
        {rows.map((r, i) => (
          <Row
            key={r.name + '-' + i}
            r={r}
            i={i}
            max={max}
            me={r.name === meName}
            onOpen={() => setSelected({ name: r.name, rank: i + 1 })}
          />
        ))}
      </motion.ol>
      <ProfileModal target={selected} onClose={() => setSelected(null)} onBanned={() => setReload((n) => n + 1)} />
    </Screen>
  );
}
