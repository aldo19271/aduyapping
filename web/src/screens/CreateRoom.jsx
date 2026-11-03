import { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Swords, Hourglass } from 'lucide-react';
import { useApp } from '../store.jsx';
import RoomForm, { DEFAULT_SETTINGS } from '../components/RoomForm.jsx';
import { Button, Screen, TopBar, itemVariants, listVariants } from '../components/ui.jsx';
import { COMING_SOON, MODES, SHOW_COMING_SOON } from '../../config/modes.js';

const MODE_ICONS = { war: Swords };

function ModePicker({ onPick }) {
  return (
    <motion.div className="mode-list" variants={listVariants} initial="initial" animate="animate">
      {MODES.map((m, i) => {
        const Icon = MODE_ICONS[m.id] || Swords;
        return (
          <motion.div key={m.id} variants={itemVariants}>
            <motion.button
              type="button"
              className="mode-card"
              onClick={() => onPick(m.id)}
              animate={{ y: [0, -4, 0], transition: { duration: 3 + i, repeat: Infinity, ease: 'easeInOut' } }}
              whileHover={{ y: -8, scale: 1.02 }}
              whileTap={{ scale: 0.94, y: 3 }}
            >
              <motion.span className="mode-icon" whileHover={{ rotate: [0, -14, 14, 0] }}>
                <Icon size={26} strokeWidth={2.5} />
              </motion.span>
              <span className="tile-text">
                <strong>{m.title}</strong>
                <small>{m.sub}</small>
              </span>
            </motion.button>
          </motion.div>
        );
      })}
      {SHOW_COMING_SOON ? (
        <motion.div variants={itemVariants}>
          <div className="mode-card soon" aria-disabled="true">
            <span className="mode-icon">
              <Hourglass size={26} strokeWidth={2.5} />
            </span>
            <span className="tile-text">
              <strong>{COMING_SOON.title}</strong>
              <small>{COMING_SOON.sub}</small>
            </span>
          </div>
        </motion.div>
      ) : null}
    </motion.div>
  );
}

export default function CreateRoom() {
  const { state, actions } = useApp();
  const [mode, setMode] = useState(null);
  const [settings, setSettings] = useState({ ...DEFAULT_SETTINGS });
  const label = state.user ? state.user.name : state.me ? state.me.name : 'baru';
  const invalid = settings.isPrivate && !settings.password.trim();

  if (!mode) {
    return (
      <Screen>
        <TopBar title="Pilih Mode" onBack={() => actions.go('menu')} />
        <ModePicker onPick={setMode} />
      </Screen>
    );
  }

  return (
    <Screen>
      <TopBar title="Create Room" onBack={() => setMode(null)} />
      <motion.div className="card" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <RoomForm value={settings} onChange={setSettings} namePlaceholder={`Room ${label}`} />
      </motion.div>
      <div className="sticky-actions">
        <Button icon={Plus} loading={state.busy} disabled={invalid} onClick={() => actions.createRoom(settings)}>
          Buat room
        </Button>
        {invalid ? <p className="note center-text">kasih password dulu beb.</p> : null}
      </div>
    </Screen>
  );
}
