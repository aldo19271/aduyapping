import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Send } from 'lucide-react';
import { api } from '../lib/api.js';
import { useApp } from '../store.jsx';
import { Button, Field, Modal } from './ui.jsx';

/** Form feedback: nama + deskripsi. Pesan masuk ke mailbox admin. */
export default function FeedbackModal({ open, onClose }) {
  const { actions } = useApp();
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (open) setErr('');
  }, [open]);

  const ready = name.trim() && message.trim().length >= 3;

  const submit = async () => {
    if (!ready || busy) return;
    setBusy(true);
    setErr('');
    try {
      await api.admin({ action: 'feedback_send', name, message });
      setName('');
      setMessage('');
      actions.toast('Feedback terkirim ke admin. Makasih beb!');
      onClose();
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Feedback">
      <Field label="Nama" placeholder="Nama kamu" maxLength={40} value={name} onChange={(e) => setName(e.target.value)} />
      <label className="field">
        <span className="field-label">Deskripsi</span>
        <textarea
          rows={5}
          maxLength={1000}
          placeholder="Tulis saran, bug, atau unek-unek kamu..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
        <span className="field-hint">{message.length}/1000</span>
      </label>
      {err ? (
        <motion.p className="error" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}>
          {err}
        </motion.p>
      ) : null}
      <Button icon={Send} loading={busy} disabled={!ready} onClick={submit}>
        Kirim feedback
      </Button>
    </Modal>
  );
}
