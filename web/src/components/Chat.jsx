import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { MessageCircle, Send, X } from 'lucide-react';
import { useApp } from '../store.jsx';

/** Tombol buka chat. variant: 'pill' (ikon + teks, di room) atau 'icon' (bulat, saat pertandingan). */
export function ChatButton({ variant = 'icon' }) {
  const { state, actions } = useApp();
  const n = state.chat.unread;
  return (
    <motion.button
      type="button"
      className={`chat-btn ${variant}`}
      aria-label="Buka chat"
      onClick={() => actions.setChatOpen(true)}
      whileHover={{ y: -3 }}
      whileTap={{ scale: 0.9 }}
    >
      <MessageCircle size={20} strokeWidth={2.5} />
      {variant === 'pill' ? <span>Chat</span> : null}
      <AnimatePresence>
        {n > 0 ? (
          <motion.i
            key={n}
            className="chat-badge"
            initial={{ scale: 0.4 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            transition={{ type: 'spring', stiffness: 500, damping: 14 }}
          >
            {n > 9 ? '9+' : n}
          </motion.i>
        ) : null}
      </AnimatePresence>
    </motion.button>
  );
}

/** Panel chat dari bawah. Dipakai sama persis di room dan di dalam pertandingan. */
export function ChatSheet({ title = 'Chat' }) {
  const { state, actions } = useApp();
  const { open, messages } = state.chat;
  const [text, setText] = useState('');
  const listRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length, open]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && actions.setChatOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, actions]);

  const close = () => actions.setChatOpen(false);
  const submit = (e) => {
    e.preventDefault();
    const t = text.trim();
    if (!t) return;
    actions.sendChat(t);
    setText('');
    if (inputRef.current) inputRef.current.focus();
  };

  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div
          key="chat-layer"
          className="chat-layer"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={close}
        >
          <motion.section
            className="chat-sheet"
            role="dialog"
            aria-label={title}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 380, damping: 34 }}
            onClick={(e) => e.stopPropagation()}
          >
            <header className="chat-head">
              <h3>{title}</h3>
              <button type="button" className="icon-btn sm" aria-label="Tutup chat" onClick={close}>
                <X size={16} strokeWidth={3} />
              </button>
            </header>
            <div className="chat-list" ref={listRef}>
              {messages.length === 0 ? <p className="chat-empty">Belum ada pesan. Sapa dulu.</p> : null}
              {messages.map((m) => {
                const mine = m.from === state.youId;
                return (
                  <motion.div
                    key={m.id}
                    className={`chat-msg ${mine ? 'me' : ''}`}
                    initial={{ opacity: 0, y: 10, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ type: 'spring', stiffness: 420, damping: 26 }}
                  >
                    <div className="chat-bubble">
                      {mine ? null : <b>{m.name}</b>}
                      <span>{m.text}</span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
            <form className="chat-form" onSubmit={submit}>
              <input
                ref={inputRef}
                value={text}
                maxLength={120}
                placeholder="Tulis pesan"
                enterKeyHint="send"
                autoComplete="off"
                aria-label="Tulis pesan"
                onChange={(e) => setText(e.target.value)}
              />
              <button type="submit" className="chat-send" aria-label="Kirim" disabled={!text.trim()}>
                <Send size={20} strokeWidth={2.5} />
              </button>
            </form>
          </motion.section>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
