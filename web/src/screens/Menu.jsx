import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Coins, DoorOpen, Info, Lock, PlusSquare, ShoppingBag, Trophy, Settings, ShieldCheck } from 'lucide-react';
import { useApp } from '../store.jsx';
import Avatar from '../components/Avatar.jsx';
import FabFan from '../components/FabFan.jsx';
import { CountUp, Marquee, useRipple } from '../components/fx.jsx';
import { Screen, itemVariants, listVariants } from '../components/ui.jsx';
import { DEFAULT_SKIN } from '../../config/skins.js';

const TIPS = [
  'Tips: Tap avatar musuh untuk memilih target serangan.',
  'Tips: Kata salah berwarna merah. Hapus dulu sebelum spasi.',
  'Tips: Spasi saat kata salah akan melewati kata tanpa damage.',
  'Tips: Menang dapat 10 koin, kalah 5 koin.',
  'Tips: Combo kata benar beruntun bikin kamu makin panas.',
];

const WORDS = ['ngetik', 'ngatos', 'temenan', 'opoyo', 'ez', 'mayan', 'by1', 'gampang'];

function Tip() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((n) => (n + 1) % TIPS.length), 4200);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="tip">
      <AnimatePresence mode="wait" initial={false}>
        <motion.p
          key={i}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.25 }}
        >
          {TIPS[i]}
        </motion.p>
      </AnimatePresence>
    </div>
  );
}

function Tile({ icon: Icon, title, sub, onClick, locked, accent, i }) {
  const [down, ripples] = useRipple();
  return (
    <motion.div variants={itemVariants}>
      <motion.button
        type="button"
        className={`tile ${accent ? 'accent' : ''} ${locked ? 'locked' : ''}`}
        onClick={onClick}
        onPointerDown={down}
        animate={{
          y: [0, -5, 0],
          transition: { duration: 3.2 + i * 0.5, repeat: Infinity, ease: 'easeInOut', delay: i * 0.35 },
        }}
        variants={{ hover: { y: -9, rotate: i % 2 ? 1.6 : -1.6, scale: 1.03, transition: { type: 'spring', stiffness: 400, damping: 18 } } }}
        whileHover="hover"
        whileTap={{ scale: 0.95 }}
      >
        {ripples}
        <motion.span
          className="tile-icon"
          variants={{ hover: { rotate: [0, -14, 14, -8, 0], scale: 1.18 } }}
          transition={{ duration: 0.5 }}
        >
          {locked ? <Lock size={22} strokeWidth={2.5} /> : <Icon size={24} strokeWidth={2.5} />}
        </motion.span>
        <span className="tile-text">
          <strong>{title}</strong>
          <small>{sub}</small>
        </span>
      </motion.button>
    </motion.div>
  );
}

export default function Menu() {
  const { state, actions } = useApp();
  const { user, me, conn } = state;
  const name = user ? user.name : me ? me.name : 'menghubungkan...';
  const skin = user ? user.skin : DEFAULT_SKIN;

  const needLogin = (screen) =>
    user ? actions.go(screen) : actions.toast('Login dulu ajg biar kebuka.');

  return (
    <Screen>
      <motion.header
        className="profile"
        initial={{ opacity: 0, y: -24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 340, damping: 24 }}
      >
        <motion.div whileHover={{ rotate: [0, -10, 10, 0], scale: 1.1 }} whileTap={{ y: -14 }}>
          <Avatar skin={skin} size={52} />
        </motion.div>
        <div className="profile-text">
          <motion.strong key={name} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
            {name}
          </motion.strong>
          <small className={`conn ${conn}`}>
            <i />{' '}
            {conn === 'online' ? 'Terhubung' : conn === 'connecting' ? 'Menyalakan server...' : 'Terputus, mencoba lagi...'}
          </small>
        </div>
        {user ? (
          <motion.div className="coins" whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92, rotate: -4 }}>
            <motion.span animate={{ rotateY: [0, 360] }} transition={{ duration: 2.4, repeat: Infinity, ease: 'linear' }}>
              <Coins size={18} strokeWidth={2.5} />
            </motion.span>
            <CountUp value={user.coins} />
          </motion.div>
        ) : null}
      </motion.header>

      <motion.div className="tiles" variants={listVariants} initial="initial" animate="animate">
        <Tile i={0} icon={PlusSquare} accent title="Create Room" sub="Buat room baru" onClick={() => actions.go('create')} />
        <Tile i={1} icon={DoorOpen} title="Join Room" sub="Masuk ke room yang ada" onClick={() => actions.go('join')} />
        <Tile i={2} icon={ShoppingBag} title="Shop" sub="Beli skin dengan koin" locked={!user} onClick={() => needLogin('shop')} />
        <Tile i={3} icon={Trophy} title="Leaderboard" sub="Top 25 win dan koin" locked={!user} onClick={() => needLogin('leaderboard')} />
        {user && user.admin ? (
          <div className="tile-wide">
            <Tile i={4} icon={ShieldCheck} title="Admin" sub="Kelola akun dan mailbox feedback" onClick={() => actions.go('admin')} />
          </div>
        ) : null}
      </motion.div>

      <Tip />

      <motion.div className="foot" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}>
        {conn !== 'online' ? (
          <p className="note">
            Maklum Server gratisan tunggu beberapa detik buat nyala. Tunggu sampai status berubah menjadi Terhubung. Sabar ya bro 
          </p>
        ) : null}
      </motion.div>
      <FabFan
        items={[
          { id: 'settings', icon: Settings, onClick: () => actions.go('settings') },
          { id: 'about', icon: Info, onClick: () => actions.go('about') },
        ]}
      />
      <Marquee words={WORDS} />
    </Screen>
  );
}
