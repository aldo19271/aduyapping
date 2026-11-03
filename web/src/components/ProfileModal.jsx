import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Ban, Coins, Trophy, X } from 'lucide-react';
import { useApp } from '../store.jsx';
import { api } from '../lib/api.js';
import Avatar from './Avatar.jsx';
import { Burst, CountUp } from './fx.jsx';

function Stat({ icon: Icon, label, value, delay }) {
  return (
    <motion.div
      className="pf-stat"
      initial={{ opacity: 0, y: 30, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 340, damping: 20, delay }}
      whileHover={{ y: -5, rotate: -1.5 }}
      whileTap={{ scale: 0.95 }}
    >
      <span className="pf-stat-label">
        <motion.span
          animate={{ rotate: [0, -12, 12, 0] }}
          transition={{ duration: 2.4, repeat: Infinity, repeatDelay: 1.5, delay }}
          style={{ display: 'grid' }}
        >
          <Icon size={16} strokeWidth={2.5} />
        </motion.span>
        {label}
      </span>
      {value === null ? <span className="pf-skel" /> : <strong className="pf-stat-val"><CountUp value={value} /></strong>}
    </motion.div>
  );
}

/** Profil pemain. target = { name, rank } atau null. */
export default function ProfileModal({ target, onClose, onBanned }) {
  const { state, actions } = useApp();
  const isAdmin = !!(state.user && state.user.admin);
  const [askBan, setAskBan] = useState(false);
  const [banning, setBanning] = useState(false);
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');
  const name = target && target.name;

  useEffect(() => {
    if (!name) return undefined;
    let alive = true;
    setData(null);
    setErr('');
    setAskBan(false);
    api
      .profile(name)
      .then((r) => alive && setData(r.profile))
      .catch((e) => alive && setErr(e.message));
    return () => {
      alive = false;
    };
  }, [name]);

  const doBan = async () => {
    setBanning(true);
    try {
      await api.admin({ action: 'user_ban', name, banned: true });
      actions.toast(`${name} diban dari leaderboard.`);
      if (onBanned) onBanned(name);
      onClose();
    } catch (e) {
      actions.toast(e.message);
    } finally {
      setBanning(false);
      setAskBan(false);
    }
  };

  return (
    <AnimatePresence>
      {target ? (
        <motion.div
          className="backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="profile-sheet"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={(e, info) => {
              if (info.offset.y > 110 || info.velocity.y > 600) onClose();
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <span className="pf-handle" />
            <motion.button
              type="button"
              className="pf-close"
              aria-label="Tutup"
              onClick={onClose}
              initial={{ scale: 0, rotate: -90 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 18, delay: 0.2 }}
              whileHover={{ rotate: 90, scale: 1.1 }}
              whileTap={{ scale: 0.8 }}
            >
              <X size={22} strokeWidth={3} />
            </motion.button>

            {isAdmin && name !== (state.user && state.user.name) ? (
              <motion.div className="pf-ban-wrap" initial={{ scale: 0, rotate: 90 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 400, damping: 18, delay: 0.2 }}>
                {askBan ? (
                  <span className="pf-ban-ask">
                    <button type="button" className="pf-ban yes" disabled={banning} onClick={doBan}>Yakin ban?</button>
                    <button type="button" className="pf-ban" onClick={() => setAskBan(false)}>Batal</button>
                  </span>
                ) : (
                  <motion.button type="button" className="pf-ban" onClick={() => setAskBan(true)} whileHover={{ rotate: -8, scale: 1.08 }} whileTap={{ scale: 0.82, y: 3 }}>
                    <Ban size={16} strokeWidth={3} /> Ban?
                  </motion.button>
                )}
              </motion.div>
            ) : null}

            <motion.div
              className="pf-avatar"
              initial={{ scale: 0, rotate: -25 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 14, delay: 0.12 }}
              whileHover={{ rotate: [0, -8, 8, 0], scale: 1.06 }}
              whileTap={{ y: -18 }}
            >
              {data ? <Avatar skin={data.skin} size={112} plate={false} /> : <span className="pf-skel round" />}
              {data && target.rank && target.rank <= 3 ? <Burst fire={1} count={14} radius={80} color="#0b0b0b" /> : null}
            </motion.div>

            <motion.h2
              className="pf-name"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.22 }}
            >
              {name}
            </motion.h2>

            {target.rank ? (
              <motion.span
                className="pf-rank"
                initial={{ scale: 0 }}
                animate={{ scale: 1, rotate: [0, -6, 6, 0] }}
                transition={{ delay: 0.35, type: 'spring', stiffness: 400, damping: 12 }}
              >
                Peringkat #{target.rank}
              </motion.span>
            ) : null}

            {err ? (
              <motion.p className="pf-err" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                {err}
              </motion.p>
            ) : null}

            <div className="pf-stats">
              <Stat icon={Trophy} label="Total win" value={data ? data.wins : null} delay={0.3} />
              <Stat icon={Coins} label="Total koin" value={data ? data.coins : null} delay={0.4} />
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
