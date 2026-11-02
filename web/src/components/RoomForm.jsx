import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Lock } from 'lucide-react';
import { Field, Stepper, Switch, Tabs } from './ui.jsx';

export const DEFAULT_SETTINGS = {
  name: '',
  max: 2,
  isPrivate: false,
  password: '',
  damage: 5,
  hp: 100,
  maxWords: 300,
};

function Row({ title, hint, children }) {
  return (
    <div className="row">
      <div className="row-text">
        <strong>{title}</strong>
        {hint ? <small>{hint}</small> : null}
      </div>
      {children}
    </div>
  );
}

/** Form pengaturan room (dipakai saat membuat room dan saat ketua room mengubah pengaturan). */
export default function RoomForm({ value, onChange, namePlaceholder = 'Nama room', passwordHint }) {
  const [tab, setTab] = useState('basic');
  const set = (patch) => onChange({ ...value, ...patch });

  return (
    <div className="form">
      <Tabs
        id="roomform"
        value={tab}
        onChange={setTab}
        tabs={[
          { id: 'basic', label: 'Basic' },
          { id: 'advanced', label: 'Advanced' },
        ]}
      />
      <AnimatePresence mode="wait" initial={false}>
        {tab === 'basic' ? (
          <motion.div
            key="basic"
            className="form-body"
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 16 }}
            transition={{ duration: 0.18 }}
          >
            <Field
              label="Nama room"
              value={value.name}
              maxLength={24}
              placeholder={namePlaceholder}
              onChange={(e) => set({ name: e.target.value })}
            />
            <Row title="Jumlah pemain" hint="Min 2, maks 8">
              <Stepper value={value.max} min={2} max={8} onChange={(v) => set({ max: v })} />
            </Row>
            <Row title="Room private" hint="Tetap tampil di daftar, tapi wajib password">
              <Switch checked={value.isPrivate} onChange={(v) => set({ isPrivate: v })} label="Room private" />
            </Row>
            <AnimatePresence initial={false}>
              {value.isPrivate && (
                <motion.div
                  key="pw"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.22 }}
                  style={{ overflow: 'hidden' }}
                >
                  <Field
                    label="Password room"
                    value={value.password}
                    maxLength={20}
                    placeholder={passwordHint || 'Atur password'}
                    onChange={(e) => set({ password: e.target.value })}
                  />
                  <p className="note">
                    <Lock size={14} strokeWidth={2.5} /> Pemain lain harus memasukkan password ini untuk masuk.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ) : (
          <motion.div
            key="advanced"
            className="form-body"
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.18 }}
          >
            <Row title="Damage per kata" hint="Darah musuh berkurang tiap kata benar">
              <Stepper value={value.damage} min={1} max={50} onChange={(v) => set({ damage: v })} />
            </Row>
            <Row title="Darah per pemain">
              <Stepper value={value.hp} min={10} max={1000} step={10} onChange={(v) => set({ hp: v })} />
            </Row>
            <Row title="Maks kata">
              <Stepper value={value.maxWords} min={50} max={500} step={50} onChange={(v) => set({ maxWords: v })} />
            </Row>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
