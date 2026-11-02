import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, Copy, Crown, LogOut, Play, Settings } from 'lucide-react';
import { useApp } from '../store.jsx';
import Avatar from '../components/Avatar.jsx';
import RoomForm from '../components/RoomForm.jsx';
import { Dots } from '../components/fx.jsx';
import { ChatButton, ChatSheet } from '../components/Chat.jsx';
import { Button, Screen, TopBar } from '../components/ui.jsx';

export default function Room() {
  const { state, actions } = useApp();
  const room = state.room;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(null);
  const [copied, setCopied] = useState(false);
  const [starting, setStarting] = useState(false);

  if (!room) return null;
  const isHost = room.hostId === state.youId;
  const s = room.settings;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(room.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      actions.toast(`Kode room: ${room.code}`);
    }
  };

  const openEdit = () => {
    setDraft({ ...s, password: '' });
    setEditing(true);
  };

  if (editing && draft) {
    const invalid = draft.isPrivate && !s.isPrivate && !draft.password.trim();
    return (
      <Screen>
        <TopBar title="Pengaturan room" onBack={() => setEditing(false)} />
        <div className="card">
          <RoomForm
            value={draft}
            onChange={setDraft}
            passwordHint={s.isPrivate ? 'Kosongkan jika tidak diganti' : 'Atur password'}
          />
        </div>
        <div className="sticky-actions two">
          <Button variant="ghost" onClick={() => setEditing(false)}>
            Back
          </Button>
          <Button
            icon={Check}
            disabled={invalid}
            onClick={() => {
              actions.saveSettings(draft);
              setEditing(false);
            }}
          >
            Confirm
          </Button>
        </div>
      </Screen>
    );
  }

  const canStart = room.players.length >= 2;
  const loading = room.status !== 'lobby' || starting;

  return (
    <Screen>
      <TopBar
        title={s.name}
        right={
          <Button variant="quiet" icon={LogOut} className="sm" onClick={actions.leaveRoom}>
            Keluar
          </Button>
        }
      />

      <motion.div className="code-card" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}>
        <div>
          <small>Kode room</small>
          <strong className="code">
            {room.code.split('').map((ch, i) => (
              <motion.span
                key={`${room.code}-${i}`}
                style={{ display: 'inline-block' }}
                initial={{ rotateX: -90, opacity: 0, y: -14 }}
                animate={{ rotateX: 0, opacity: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 16, delay: 0.1 + i * 0.09 }}
                whileHover={{ y: -5 }}
              >
                {ch}
              </motion.span>
            ))}
          </strong>
        </div>
        <Button variant="ghost" className="sm" icon={copied ? Check : Copy} onClick={copy}>
          {copied ? 'Tersalin' : 'Salin'}
        </Button>
      </motion.div>

      <div className="chips">
        <span>{s.isPrivate ? 'Private' : 'Public'}</span>
        <span>
          {room.players.length}/{s.max} pemain
        </span>
        <span>Damage {s.damage}</span>
        <span>Darah {s.hp}</span>
      </div>

      <section className="players">
        <h3>Pemain</h3>
        <AnimatePresence initial={false}>
          {room.players.map((p) => (
            <motion.div
              key={p.id}
              layout
              className={`player ${p.connected ? '' : 'away'}`}
              initial={{ opacity: 0, x: -40, scale: 0.85, rotate: -2 }}
              animate={{ opacity: 1, x: 0, scale: 1, rotate: 0 }}
              exit={{ opacity: 0, x: 40, scale: 0.9 }}
              whileHover={{ x: 4 }}
              transition={{ type: 'spring', stiffness: 380, damping: 18 }}
            >
              <Avatar skin={p.skin} size={44} />
              <span className="player-name">
                {p.name}
                {p.id === state.youId ? <small> (kamu)</small> : null}
              </span>
              {p.id === room.hostId ? (
                <span className="badge">
                  <Crown size={14} strokeWidth={2.5} /> Ketua
                </span>
              ) : null}
              {!p.connected ? <span className="badge dim">Terputus</span> : null}
            </motion.div>
          ))}
        </AnimatePresence>
      </section>

      <div className="sticky-actions">
        <div className="chat-row">
          <ChatButton variant="pill" />
        </div>
        {isHost ? (
          <>
            <Button variant="ghost" icon={Settings} onClick={openEdit} disabled={loading}>
              Pengaturan room
            </Button>
            <Button
              icon={Play}
              loading={loading}
              disabled={!canStart}
              onClick={() => {
                setStarting(true);
                setTimeout(() => setStarting(false), 4000);
                actions.startGame();
              }}
            >
              {canStart ? 'Mulai game' : 'Menunggu pemain (min. 2)'}
            </Button>
          </>
        ) : (
          <p className="note center-text">Menunggu ketua room memulai game <Dots /></p>
        )}
      </div>
      <ChatSheet title="Chat room" />
    </Screen>
  );
}
