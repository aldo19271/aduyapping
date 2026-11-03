import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Ban, Pencil, Plus, Save, Trash2, UserPlus } from 'lucide-react';
import { api } from '../lib/api.js';
import { useApp } from '../store.jsx';
import { Button, Field, Modal, PasswordField, Screen, Tabs, TopBar, itemVariants, listVariants } from '../components/ui.jsx';

const fmt = (d) => {
  try {
    return new Date(d).toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
};

function Editor({ target, onClose, onSaved }) {
  const { actions } = useApp();
  const creating = target === 'new';
  const [f, setF] = useState({ username: '', email: '', password: '' });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    setErr('');
    setF({ username: '', email: '', password: '' });
  }, [target]);

  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));

  const run = async (body, okText) => {
    setBusy(true);
    setErr('');
    try {
      await api.admin(body);
      actions.toast(okText);
      onSaved();
      onClose();
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  const save = () =>
    creating
      ? run({ action: 'user_create', ...f }, 'Akun dibuat.')
      : run({ action: 'user_update', id: target.id, ...f }, 'Akun diperbarui.');

  return (
    <Modal open={!!target} onClose={onClose} title={creating ? 'Buat akun baru' : `Kelola ${target ? target.username : ''}`}>
      {!creating && target ? (
        <p className="note">
          Gmail: {target.email || '-'} · Koin {target.coins} · Win {target.wins}. Kosongkan kolom yang tidak diganti.
        </p>
      ) : null}
      <Field label={creating ? 'Username' : 'Username baru'} maxLength={16} value={f.username} onChange={set('username')} />
      <Field label={creating ? 'Gmail (opsional)' : 'Gmail baru'} type="email" inputMode="email" value={f.email} onChange={set('email')} />
      <PasswordField label={creating ? 'Password' : 'Password baru'} value={f.password} onChange={set('password')} />
      {err ? <p className="error">{err}</p> : null}
      <Button icon={creating ? UserPlus : Save} loading={busy} onClick={save}>
        {creating ? 'Buat akun' : 'Simpan perubahan'}
      </Button>
      {!creating && target && !target.is_admin ? (
        <Button
          variant="ghost"
          icon={Ban}
          loading={busy}
          onClick={() =>
            run(
              { action: 'user_ban', id: target.id, banned: !target.banned },
              target.banned ? 'Ban dicabut.' : 'Akun diban.',
            )
          }
        >
          {target.banned ? 'Cabut ban' : 'Ban akun ini'}
        </Button>
      ) : null}
    </Modal>
  );
}

function Accounts() {
  const [users, setUsers] = useState(null);
  const [err, setErr] = useState('');
  const [edit, setEdit] = useState(null);

  const load = useCallback(() => {
    api
      .admin({ action: 'users_list' })
      .then((r) => setUsers(r.users))
      .catch((e) => setErr(e.message));
  }, []);
  useEffect(load, [load]);

  return (
    <>
      <Button icon={Plus} onClick={() => setEdit('new')}>
        Buat akun baru
      </Button>
      {err ? <p className="error">{err}</p> : null}
      {!users && !err ? (
        <p className="empty">
          <span className="spin big" />
        </p>
      ) : null}
      <motion.ul className="adm-list" variants={listVariants} initial="initial" animate="animate">
        {(users || []).map((u) => (
          <motion.li key={u.id} variants={itemVariants}>
            <motion.button
              type="button"
              className={`adm-row ${u.banned ? 'banned' : ''}`}
              whileHover={{ x: 5 }}
              whileTap={{ scale: 0.96, y: 2 }}
              onClick={() => setEdit(u)}
            >
              <span className="adm-main">
                <strong>{u.username}</strong>
                <small>{u.email || 'tanpa Gmail'} · {u.coins} koin · {u.wins} win</small>
              </span>
              {u.is_admin ? <span className="adm-chip">admin</span> : null}
              {u.banned ? <span className="adm-chip ban">ban</span> : null}
              <Pencil size={16} strokeWidth={2.5} />
            </motion.button>
          </motion.li>
        ))}
      </motion.ul>
      <Editor target={edit} onClose={() => setEdit(null)} onSaved={load} />
    </>
  );
}

function Mailbox() {
  const { actions } = useApp();
  const [items, setItems] = useState(null);
  const [err, setErr] = useState('');

  const load = useCallback(() => {
    api
      .admin({ action: 'feedback_list' })
      .then((r) => setItems(r.items))
      .catch((e) => setErr(e.message));
  }, []);
  useEffect(load, [load]);

  const del = async (id) => {
    try {
      await api.admin({ action: 'feedback_delete', id });
      setItems((l) => l.filter((x) => x.id !== id));
    } catch (e) {
      actions.toast(e.message);
    }
  };

  return (
    <>
      {err ? <p className="error">{err}</p> : null}
      {!items && !err ? (
        <p className="empty">
          <span className="spin big" />
        </p>
      ) : null}
      {items && items.length === 0 ? <p className="empty">Mailbox kosong.</p> : null}
      <motion.ul className="adm-list" variants={listVariants} initial="initial" animate="animate">
        <AnimatePresence>
          {(items || []).map((m) => (
            <motion.li key={m.id} variants={itemVariants} exit={{ opacity: 0, x: 60 }} layout className="mail">
              <div className="mail-head">
                <strong>{m.name}</strong>
                <small>@{m.username} · {fmt(m.created_at)}</small>
                <motion.button type="button" className="mail-del" aria-label="Hapus" whileTap={{ scale: 0.8 }} onClick={() => del(m.id)}>
                  <Trash2 size={16} strokeWidth={2.5} />
                </motion.button>
              </div>
              <p>{m.message}</p>
            </motion.li>
          ))}
        </AnimatePresence>
      </motion.ul>
    </>
  );
}

export default function Admin() {
  const { actions } = useApp();
  const [tab, setTab] = useState('akun');
  return (
    <Screen>
      <TopBar title="Admin" onBack={() => actions.go('menu')} />
      <Tabs
        id="adm"
        value={tab}
        onChange={setTab}
        tabs={[
          { id: 'akun', label: 'Akun' },
          { id: 'mail', label: 'Mailbox' },
        ]}
      />
      <motion.div key={tab} className="adm-body" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        {tab === 'akun' ? <Accounts /> : <Mailbox />}
      </motion.div>
    </Screen>
  );
}
