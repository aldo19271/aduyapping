import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, Play, RotateCcw } from 'lucide-react';
import { useApp } from '../store.jsx';
import Donut from '../components/Donut.jsx';
import { Button, Screen, Stepper, Switch, TopBar } from '../components/ui.jsx';
import { pickWords } from '../../config/practiceWords.js';

const MAX_WORDS_RANGE = { min: 10, max: 500 };
const DEFAULT_MINUTES = 5;

const mmss = (ms) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
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

function Setup({ cfg, onChange, onStart }) {
  return (
    <>
      <motion.div className="card form" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <Row title="Maks kata" hint="Jumlah kata yang akan diketik">
          <Stepper value={cfg.maxWords} min={MAX_WORDS_RANGE.min} max={MAX_WORDS_RANGE.max} step={10} onChange={(v) => onChange({ maxWords: v })} />
        </Row>
        <Row title="Timer" hint={cfg.timerOn ? 'Latihan berhenti saat waktu habis' : 'Mati: tanpa batas waktu'}>
          <Switch checked={cfg.timerOn} onChange={(v) => onChange({ timerOn: v })} label="Timer" />
        </Row>
        <AnimatePresence initial={false}>
          {cfg.timerOn ? (
            <motion.div
              key="min"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.22 }}
              style={{ overflow: 'hidden' }}
            >
              <Row title="Menit" hint="Min 1 menit, angka saja">
                <Stepper value={cfg.minutes} min={1} max={60} onChange={(v) => onChange({ minutes: v })} />
              </Row>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </motion.div>
      <div className="sticky-actions">
        <Button icon={Play} onClick={onStart}>
          Mulai latihan
        </Button>
      </div>
    </>
  );
}

function Run({ cfg, onDone }) {
  const words = useMemo(() => pickWords(cfg.maxWords), [cfg.maxWords]);
  const [idx, setIdx] = useState(0);
  const [typed, setTyped] = useState('');
  const [left, setLeft] = useState(cfg.timerOn ? cfg.minutes * 60_000 : null);
  const inputRef = useRef(null);
  const st = useRef({ keys: 0, wrongKeys: 0, okWords: 0, okChars: 0, idx: 0, typed: '', done: false, first: 0 });
  const startAt = useRef(Date.now());

  const finish = () => {
    const s = st.current;
    if (s.done) return;
    s.done = true;
    const end = Date.now();
    onDone({
      keys: s.keys,
      wrongKeys: s.wrongKeys,
      okWords: s.okWords,
      okChars: s.okChars,
      typedWords: s.idx,
      ms: Math.max(1, end - (s.first || startAt.current)),
    });
  };

  useEffect(() => {
    if (inputRef.current) inputRef.current.focus();
    if (!cfg.timerOn) return undefined;
    const endAt = startAt.current + cfg.minutes * 60_000;
    const t = setInterval(() => {
      const rest = endAt - Date.now();
      setLeft(rest);
      if (rest <= 0) finish();
    }, 200);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const word = words[idx];
  const bad = typed.length > 0 && !word.startsWith(typed);

  const onChange = (e) => {
    const s = st.current;
    if (s.done) return;
    const raw = e.target.value.toLowerCase().replace(/[^a-z ]/g, '');
    const hasSpace = raw.includes(' ');
    const body = hasSpace ? raw.split(' ')[0] : raw;
    const cur = words[s.idx];
    for (let i = s.typed.length; i < body.length; i++) {
      if (!s.first) s.first = Date.now();
      s.keys++;
      if (!cur.startsWith(body.slice(0, i + 1))) s.wrongKeys++;
    }
    if (hasSpace) {
      s.typed = '';
      setTyped('');
      if (body.length === 0) return;
      if (!s.first) s.first = Date.now();
      s.keys++;
      if (body === cur) {
        s.okWords++;
        s.okChars += cur.length + 1;
      } else {
        s.wrongKeys++;
      }
      s.idx++;
      setIdx(s.idx);
      if (s.idx >= words.length) finish();
      return;
    }
    s.typed = raw;
    setTyped(raw);
  };

  return (
    <>
      <div className="chips">
        {left !== null ? <span className="chip practice-timer">{mmss(left)}</span> : null}
        <span className="chip">
          {idx} / {words.length} kata
        </span>
      </div>
      <div className="arena practice-arena">
        <motion.div
          key={idx}
          className={`word-current ${bad ? 'bad' : ''}`}
          initial={{ y: 18, opacity: 0, scale: 0.9 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 600, damping: 26 }}
        >
          {word.split('').map((ch, i) => (
            <span key={i} className={i < typed.length ? (typed[i] === ch ? 'ok' : 'err') : ''}>
              {ch}
            </span>
          ))}
        </motion.div>
        <div className="word-next">
          {words.slice(idx + 1, idx + 5).map((w, i) => (
            <span key={`${idx}-${i}`}>{w}</span>
          ))}
        </div>
      </div>
      <div className="sticky-actions">
        <div className={`typebox ${bad ? 'bad' : ''}`}>
          <input
            ref={inputRef}
            value={typed}
            onChange={onChange}
            placeholder="ketik kata lalu spasi"
            inputMode="text"
            enterKeyHint="send"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="none"
            spellCheck={false}
            aria-label="Ketik kata"
          />
        </div>
        <Button variant="ghost" onClick={finish}>
          Selesai sekarang
        </Button>
      </div>
    </>
  );
}

function Result({ r, onAgain, onExit }) {
  const minutes = r.ms / 60_000;
  const wpm = Math.round(r.okChars / 5 / minutes);
  const acc = r.keys > 0 ? Math.round(((r.keys - r.wrongKeys) / r.keys) * 100) : 0;
  const okKeys = r.keys - r.wrongKeys;
  const secs = Math.round(r.ms / 1000);
  const stats = [
    { v: wpm, l: 'WPM' },
    { v: `${r.okWords} / ${r.typedWords}`, l: 'kata benar' },
    { v: okKeys, l: 'ketikan benar' },
    { v: r.wrongKeys, l: 'ketikan salah' },
  ];
  return (
    <motion.div className="practice-result" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <Donut
        segments={[
          { label: 'Benar', value: okKeys, color: 'var(--ok-green, #2fbf71)' },
          { label: 'Salah', value: r.wrongKeys, color: 'var(--team-red, #e5453a)' },
        ]}
      >
        <strong>{acc}%</strong>
        <small>akurasi</small>
      </Donut>
      <div className="donut-legend">
        <span>
          <i style={{ background: 'var(--ok-green, #2fbf71)' }} /> Benar
        </span>
        <span>
          <i style={{ background: 'var(--team-red, #e5453a)' }} /> Salah
        </span>
      </div>
      <div className="stat-grid">
        {stats.map((s, i) => (
          <motion.div key={s.l} className="stat" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + i * 0.07 }}>
            <strong>{s.v}</strong>
            <small>{s.l}</small>
          </motion.div>
        ))}
      </div>
      <p className="note center-text">Waktu mengetik {secs} detik</p>
      <div className="sticky-actions row2">
        <Button variant="ghost" icon={RotateCcw} onClick={onAgain}>
          Ulangi
        </Button>
        <Button icon={Check} onClick={onExit}>
          Selesai
        </Button>
      </div>
    </motion.div>
  );
}

export default function Practice() {
  const { actions } = useApp();
  const [cfg, setCfg] = useState({ maxWords: 50, timerOn: false, minutes: DEFAULT_MINUTES });
  const [phase, setPhase] = useState('setup');
  const [result, setResult] = useState(null);
  const [run, setRun] = useState(0);

  const title = phase === 'result' ? 'Hasil latihan' : 'Practice';
  const back = () => (phase === 'run' ? setPhase('setup') : actions.go('menu'));

  return (
    <Screen>
      <TopBar title={title} onBack={back} />
      {phase === 'setup' ? (
        <Setup cfg={cfg} onChange={(p) => setCfg((c) => ({ ...c, ...p }))} onStart={() => { setRun((n) => n + 1); setPhase('run'); }} />
      ) : null}
      {phase === 'run' ? (
        <Run
          key={run}
          cfg={cfg}
          onDone={(r) => {
            setResult(r);
            setPhase('result');
          }}
        />
      ) : null}
      {phase === 'result' && result ? (
        <Result
          r={result}
          onAgain={() => {
            setRun((n) => n + 1);
            setPhase('run');
          }}
          onExit={() => actions.go('menu')}
        />
      ) : null}
    </Screen>
  );
}
