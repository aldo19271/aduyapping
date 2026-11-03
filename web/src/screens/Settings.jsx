import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { LogOut, Volume2, VolumeX } from 'lucide-react';
import { useApp } from '../store.jsx';
import { Button, Field, PasswordField, Screen, Switch, TopBar } from '../components/ui.jsx';
import { useSound } from '../lib/sound.js';

function AccountForm() {
  const { state, actions } = useApp();
  const user = state.user;
  const [email, setEmail] = useState(user.email || '');
  const [username, setUsername] = useState(user.name);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const emailChanged = email.trim() !== '' && email.trim().toLowerCase() !== (user.email || '');
  const nameChanged = username.trim() !== '' && username.trim() !== user.name;
  const passChanged = password !== '';
  const dirty = emailChanged || nameChanged || passChanged;

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const body = {};
      if (emailChanged) body.email = email.trim();
      if (nameChanged) body.username = username.trim();
      if (passChanged) body.password = password;
      await actions.updateAccount(body);
      setPassword('');
      actions.toast('Akun diperbarui.');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.form
      className="stack account-form"
      onSubmit={submit}
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 320, damping: 24, delay: 0.1 }}
    >
      <p className="section-label">Akun</p>
      <Field
        label="Gmail"
        type="email"
        inputMode="email"
        value={email}
        maxLength={64}
        autoComplete="email"
        onChange={(e) => setEmail(e.target.value)}
        hint={user.email ? undefined : 'Akun ini belum punya Gmail. Isi supaya bisa pulihkan password.'}
      />
      <Field label="Username" value={username} maxLength={16} onChange={(e) => setUsername(e.target.value)} />
      <PasswordField
        label="Password baru"
        value={password}
        maxLength={72}
        autoComplete="new-password"
        onChange={(e) => setPassword(e.target.value)}
        hint="Kosongkan kalau password tidak diganti"
      />
      <AnimatePresence>
        {error && (
          <motion.p
            className="error"
            initial={{ opacity: 0, height: 0, x: 0 }}
            animate={{ opacity: 1, height: 'auto', x: [0, -8, 8, -5, 5, 0] }}
            exit={{ opacity: 0, height: 0 }}
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>
      <Button type="submit" loading={loading} disabled={!dirty}>
        Simpan
      </Button>
    </motion.form>
  );
}

export default function SettingsScreen() {
  const { state, actions } = useApp();
  const [soundOn, setSoundOn] = useSound();
  return (
    <Screen>
      <TopBar title="Pengaturan" onBack={() => actions.go('menu')} />
      <motion.div
        className="setting-row"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 320, damping: 24 }}
        whileTap={{ scale: 0.98 }}
      >
        <motion.span
          key={soundOn ? 'on' : 'off'}
          className="setting-icon"
          initial={{ scale: 0.4, rotate: -35 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 500, damping: 14 }}
        >
          {soundOn ? <Volume2 size={22} strokeWidth={2.5} /> : <VolumeX size={22} strokeWidth={2.5} />}
        </motion.span>
        <span className="setting-text">
          <strong>Suara</strong>
          <small>{soundOn ? 'Efek suara menyala' : 'Efek suara mati'}</small>
        </span>
        <Switch checked={soundOn} onChange={setSoundOn} label="Efek suara" />
      </motion.div>
      {state.user ? <AccountForm /> : null}
      <Button variant="ghost" icon={LogOut} className="logout-btn" onClick={actions.logout}>
        {state.user ? 'Log Out' : 'Log Out'}
      </Button>
    </Screen>
  );
}
