import { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';
import { useApp } from '../store.jsx';
import RoomForm, { DEFAULT_SETTINGS } from '../components/RoomForm.jsx';
import { Button, Screen, TopBar } from '../components/ui.jsx';

export default function CreateRoom() {
  const { state, actions } = useApp();
  const [settings, setSettings] = useState({ ...DEFAULT_SETTINGS });
  const label = state.user ? state.user.name : state.me ? state.me.name : 'baru';
  const invalid = settings.isPrivate && !settings.password.trim();

  return (
    <Screen>
      <TopBar title="Create Room" onBack={() => actions.go('menu')} />
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
