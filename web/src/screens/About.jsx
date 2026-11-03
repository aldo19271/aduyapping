import { motion } from 'framer-motion';
import { useState } from 'react';
import { ArrowUpRight, Camera, Code, Link as LinkIcon, MessageSquareText, Lock } from 'lucide-react';
import { useApp } from '../store.jsx';
import LogoMark from '../components/logoabout.jsx';
import { Typewriter, useRipple } from '../components/fx.jsx';
import { Screen, TopBar, itemVariants, listVariants } from '../components/ui.jsx';
import FeedbackModal from '../components/FeedbackModal.jsx';
import { ABOUT } from '../../config/about.js';

const ICONS = { camera: Camera, code: Code, link: LinkIcon };

function LinkTile({ item, i }) {
  const [down, ripples] = useRipple();
  const Icon = ICONS[item.icon] || LinkIcon;
  return (
    <motion.div variants={itemVariants}>
      <motion.a
        className="tile link-tile"
        href={item.url}
        target="_blank"
        rel="noopener noreferrer"
        onPointerDown={down}
        animate={{
          y: [0, -4, 0],
          transition: { duration: 3 + i * 0.6, repeat: Infinity, ease: 'easeInOut', delay: i * 0.3 },
        }}
        variants={{ hover: { y: -8, rotate: i % 2 ? 1.4 : -1.4, scale: 1.03, transition: { type: 'spring', stiffness: 400, damping: 18 } } }}
        whileHover="hover"
        whileTap={{ scale: 0.95 }}
      >
        {ripples}
        <motion.span className="tile-icon" variants={{ hover: { rotate: [0, -14, 14, -8, 0], scale: 1.18 } }} transition={{ duration: 0.5 }}>
          <Icon size={24} strokeWidth={2.5} />
        </motion.span>
        <motion.span className="tile-go" variants={{ hover: { x: 3, y: -3 } }}>
          <ArrowUpRight size={20} strokeWidth={3} />
        </motion.span>
        <span className="tile-text">
          <strong>{item.label}</strong>
          {item.sub ? <small>{item.sub}</small> : null}
        </span>
      </motion.a>
    </motion.div>
  );
}

function FeedbackTile({ i, locked, onClick }) {
  const [down, ripples] = useRipple();
  return (
    <motion.div variants={itemVariants}>
      <motion.button
        type="button"
        className={`tile link-tile ${locked ? 'locked' : ''}`}
        onClick={onClick}
        onPointerDown={down}
        animate={{ y: [0, -4, 0], transition: { duration: 3 + i * 0.6, repeat: Infinity, ease: 'easeInOut', delay: i * 0.3 } }}
        variants={{ hover: { y: -8, rotate: -1.4, scale: 1.03, transition: { type: 'spring', stiffness: 400, damping: 18 } } }}
        whileHover="hover"
        whileTap={{ scale: 0.93, y: 2 }}
      >
        {ripples}
        <motion.span className="tile-icon" variants={{ hover: { rotate: [0, -14, 14, -8, 0], scale: 1.18 } }} transition={{ duration: 0.5 }}>
          {locked ? <Lock size={22} strokeWidth={2.5} /> : <MessageSquareText size={24} strokeWidth={2.5} />}
        </motion.span>
        <span className="tile-text">
          <strong>Feedback</strong>
          <small>{locked ? 'Login dulu' : 'Kirim saran ke admin'}</small>
        </span>
      </motion.button>
    </motion.div>
  );
}

export default function About() {
  const { state, actions } = useApp();
  const [fb, setFb] = useState(false);
  return (
    <Screen>
      <TopBar title="About" onBack={() => actions.go('menu')} />

      <motion.div
        className="about-card"
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 320, damping: 24 }}
      >
        <motion.span
          className="logo-mark"
          animate={{ rotate: [0, -8, 8, 0], y: [0, -4, 0], transition: { duration: 4.5, repeat: Infinity, ease: 'easeInOut' } }}
          whileTap={{ rotate: 360, scale: 1.2 }}
        >
          <LogoMark />
        </motion.span>
        <div className="about-card-text">
          <h3>{ABOUT.name}</h3>
          <p className="about-tag">
            <Typewriter text={ABOUT.tagline} delay={500} />
          </p>
        </div>
        <motion.span
          className="version-chip"
          initial={{ scale: 0, rotate: -20 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 420, damping: 12, delay: 0.5 }}
        >
          v{ABOUT.version}
        </motion.span>
      </motion.div>

      <motion.p className="section-label" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
        Tautan
      </motion.p>
      <motion.div className="tiles" variants={listVariants} initial="initial" animate="animate">
        {ABOUT.links.map((l, i) => (
          <LinkTile key={l.id} item={l} i={i} />
        ))}
        <FeedbackTile
          i={ABOUT.links.length}
          locked={!state.user}
          onClick={() => (state.user ? setFb(true) : actions.toast('Login dulu biar bisa kirim feedback.'))}
        />
      </motion.div>
      <FeedbackModal open={fb} onClose={() => setFb(false)} />
    </Screen>
  );
}
