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
  mode: 'team',
  teamNames: ['Tim Merah', 'Tim Biru'],
  specOn: true,
  specMax: 5,
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
            <div className="mode-pick">
              <span className="field-label">Mode</span>
              <Tabs
                id="roommode"
                value={value.mode || 'team'}
                onChange={(v) => set({ mode: v })}
                tabs={[
                  { id: 'team', label: 'Team' },
                  { id: 'solo', label: 'Solo' },
                ]}
              />
              <small className="note">
                {value.mode === 'solo'
                  ? 'Semua pemain saling bermusuhan. Posisi karakter melingkar.'
                  : 'Dua tim saling serang. Pemain bisa pindah ke slot kosong di room.'}
              </small>
            </div>
            <AnimatePresence initial={false}>
              {value.mode !== 'solo' && (
                <motion.div
                  key="teamnames"
                  className="team-names"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.22 }}
                  style={{ overflow: 'hidden' }}
                >
                  {[0, 1].map((i) => (
                    <Field
                      key={i}
                      className={`team-field ${i === 0 ? 'red' : 'blue'}`}
                      label={i === 0 ? 'Nama tim merah' : 'Nama tim biru'}
                      value={(value.teamNames || DEFAULT_SETTINGS.teamNames)[i]}
                      maxLength={14}
                      placeholder={DEFAULT_SETTINGS.teamNames[i]}
                      onChange={(e) => {
                        const names = [...(value.teamNames || DEFAULT_SETTINGS.teamNames)];
                        names[i] = e.target.value;
                        set({ teamNames: names });
                      }}
                    />
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
            <Row title="Jumlah pemain" hint={value.mode === 'solo' ? 'Min 2, maks 8' : 'Min 2, maks 8 (dibagi 2 tim)'}>
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
            <Row title="Spectator" hint="Penonton di room, bisa dimatikan">
              <Switch checked={value.specOn !== false} onChange={(v) => set({ specOn: v })} label="Spectator" />
            </Row>
            <AnimatePresence initial={false}>
              {value.specOn !== false && (
                <motion.div
                  key="specmax"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.22 }}
                  style={{ overflow: 'hidden' }}
                >
                  <Row title="Slot spectator" hint="Min 1, maks 5">
                    <Stepper value={value.specMax || 5} min={1} max={5} onChange={(v) => set({ specMax: v })} />
                  </Row>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
