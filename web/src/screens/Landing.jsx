import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { LogIn, UserPlus, User } from 'lucide-react';
import { useApp } from '../store.jsx';
import { Button, Field, PasswordField, Screen, itemVariants, listVariants } from '../components/ui.jsx';
import { Marquee, Typewriter } from '../components/fx.jsx';
import LogoMark from '../components/LogoMark.jsx';
import ForgotForm from '../components/ForgotForm.jsx';

const WORDS = ['ngetik', 'kelasz', 'musuhan', 'by1', 'ez', 'yapping', 'booyah', 'sikat', 'tutor', 'empuk'];

function Letters({ text, base = 0 }) {
  return text.split('').map((ch, i) => (
    <motion.span
      key={i}
      className="letter"
      initial={{ y: -60, opacity: 0, rotate: -18 }}
      animate={{ y: 0, opacity: 1, rotate: 0 }}
      transition={{ type: 'spring', stiffness: 360, damping: 13, delay: base + i * 0.055 }}
      whileHover={{ y: -8, rotate: 6 }}
      whileTap={{ scale: 0.8 }}
    >
      {ch}
    </motion.span>
  ));
}

export default function Landing() {
  const { actions } = useApp();
  const [mode, setMode] = useState(null); // null | 'login' | 'register'
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'login') await actions.login(username.trim(), password);
      else await actions.register(username.trim(), email.trim(), password);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <Screen className="center">
      <motion.div className="landing" variants={listVariants} initial="initial" animate="animate">
        <motion.div className="logo" variants={itemVariants}>
          <motion.span
            className="logo-mark"
            animate={{ rotate: [0, -8, 8, 0], y: [0, -5, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            whileTap={{ rotate: 360, scale: 1.2 }}
          >
            <LogoMark />
          </motion.span>
          <h1>
            <Letters text="Adu" base={0.15} />
            <span className="accent">
              <Letters text="Yapping" base={0.6} />
            </span>
          </h1>
        </motion.div>
        <motion.p className="tagline" variants={itemVariants}>
          <Typewriter text="Adu Yapping deck. Yapping lebih cepat, musuh tepar." delay={900} />
        </motion.p>

        <AnimatePresence mode="wait">
          {mode === null ? (
            <motion.div
              key="choose"
              className="stack"
              variants={listVariants}
              initial="initial"
              animate="animate"
              exit={{ opacity: 0, y: -14, transition: { duration: 0.15 } }}
            >
              <motion.div variants={itemVariants}>
                <Button icon={LogIn} onClick={() => setMode('login')}>
                  Masuk
                </Button>
              </motion.div>
              <motion.div variants={itemVariants}>
                <Button variant="ghost" icon={UserPlus} onClick={() => setMode('register')}>
                  Buat akun
                </Button>
              </motion.div>
              <motion.div variants={itemVariants}>
                <Button variant="quiet" icon={User} onClick={actions.playAsGuest}>
                  Main sebagai guest
                </Button>
              </motion.div>
              <motion.p className="note center-text" variants={itemVariants}>
                Recommended Login/Buat Akun dulu ya deck biar data mu ke simpen.
              </motion.p>
            </motion.div>
          ) : mode === 'forgot' ? (
            <ForgotForm
              key="forgot"
              onBack={() => {
                setMode('login');
                setError('');
              }}
            />
          ) : (
            <motion.form
              key="form"
              className="stack"
              onSubmit={submit}
              initial={{ opacity: 0, y: 24, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -14, transition: { duration: 0.15 } }}
              transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            >
              <Field
                label="Username"
                value={username}
                maxLength={16}
                autoFocus
                onChange={(e) => setUsername(e.target.value)}
                hint={mode === 'register' ? '3-16 karakter: huruf, angka, underscore' : undefined}
              />
              {mode === 'register' ? (
                <Field
                  label="Gmail"
                  type="email"
                  inputMode="email"
                  value={email}
                  maxLength={64}
                  autoComplete="email"
                  onChange={(e) => setEmail(e.target.value)}
                  hint="Dipakai untuk pemulihan akun, 1 Gmail hanya untuk 1 akun"
                />
              ) : null}
              <PasswordField
                label="Password"
                value={password}
                maxLength={72}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                onChange={(e) => setPassword(e.target.value)}
                hint={mode === 'register' ? 'Minimal 6 karakter' : undefined}
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
              <Button type="submit" loading={loading} disabled={!username || !password || (mode === 'register' && !email)}>
                {mode === 'login' ? 'Masuk' : 'Daftar'}
              </Button>
              {mode === 'login' ? (
                <button
                  type="button"
                  className="forgot-link"
                  onClick={() => {
                    setMode('forgot');
                    setError('');
                  }}
                >
                  Lupa password?
                </button>
              ) : null}
              <Button
                variant="quiet"
                onClick={() => {
                  setMode(mode === 'login' ? 'register' : 'login');
                  setError('');
                }}
              >
                {mode === 'login' ? 'Blom punya akun? Daftar dulu bos' : 'Dah punya akun? Masuk sini lah bos'}
              </Button>
              <Button
                variant="quiet"
                onClick={() => {
                  setMode(null);
                  setError('');
                }}
              >
                Kembali
              </Button>
            </motion.form>
          )}
        </AnimatePresence>
      </motion.div>
      <Marquee words={WORDS} />
    </Screen>
  );
}
