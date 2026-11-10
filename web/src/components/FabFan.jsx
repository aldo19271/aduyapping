import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

/**
 * FAB Fan: tombol bulat di pojok; saat ditekan, tombol-tombol lain
 * mengembang melengkung (kipas) dari tombol utama.
 * items = [{ id, label, icon: Icon, onClick }]
 */
export default function FabFan({ items, radius = 92 }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  // sudut 180° (kiri) sampai 270° (atas), dibagi rata
  const pos = (i) => {
    const n = items.length;
    const a = Math.PI + (n === 1 ? Math.PI / 4 : (i * (Math.PI / 2)) / (n - 1));
    return { x: Math.cos(a) * radius, y: Math.sin(a) * radius };
  };

  return (
    <>
      <AnimatePresence>
        {open ? (
          <motion.div
            className="fab-scrim"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
          />
        ) : null}
      </AnimatePresence>
      <div className="fab-wrap">
        <AnimatePresence>
          {open
            ? items.map((it, i) => {
                const p = pos(i);
                const Icon = it.icon;
                return (
                  <motion.button
                    key={it.id}
                    type="button"
                    className="fab-item"
                    aria-label={it.label}
                    initial={{ x: 0, y: 0, scale: 0, opacity: 0, rotate: -90 }}
                    animate={{ x: p.x, y: p.y, scale: 1, opacity: 1, rotate: 0 }}
                    exit={{ x: 0, y: 0, scale: 0, opacity: 0, rotate: -90 }}
                    transition={{ type: 'spring', stiffness: 420, damping: 22, delay: i * 0.05 }}
                    whileHover={{ scale: 1.12 }}
                    whileTap={{ scale: 0.85, y: p.y + 3 }}
                    onClick={() => {
                      setOpen(false);
                      it.onClick();
                    }}
                  >
                    <Icon size={22} strokeWidth={2.5} />
                    <span className="fab-label">{it.label}</span>
                  </motion.button>
                );
              })
            : null}
        </AnimatePresence>
        <motion.span className="fab-pulse" aria-hidden="true" animate={open ? { scale: 1, opacity: 0 } : { scale: [1, 1.5], opacity: [0.45, 0] }} transition={open ? { duration: 0.2 } : { duration: 2.2, repeat: Infinity, ease: 'easeOut' }} />
        <motion.button
          type="button"
          className="fab-main"
          aria-label={open ? 'Tutup menu' : 'Buka menu'}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          animate={{ rotate: open ? 180 : 0, scale: open ? 1.06 : 1, borderRadius: open ? '38%' : '50%' }}
          transition={{ type: 'spring', stiffness: 360, damping: 16 }}
          whileHover={{ scale: 1.1, rotate: open ? 180 : -6 }}
          whileTap={{ scale: 0.86, y: 4 }}
        >
          <span className="burger" aria-hidden="true">
            <motion.i
              animate={open ? { y: 7.5, rotate: 45, scaleX: 1 } : { y: 0, rotate: 0, scaleX: [1, 1, 0.65, 1] }}
              transition={open ? { type: 'spring', stiffness: 420, damping: 18 } : { default: { type: 'spring', stiffness: 420, damping: 18 }, scaleX: { duration: 3.2, repeat: Infinity, delay: 0 } }}
            />
            <motion.i
              animate={open ? { opacity: 0, scaleX: 0 } : { opacity: 1, scaleX: [0.75, 1.08, 0.75] }}
              transition={open ? { duration: 0.15 } : { default: { duration: 0.15 }, scaleX: { duration: 3.2, repeat: Infinity, delay: 0.25 } }}
            />
            <motion.i
              animate={open ? { y: -7.5, rotate: -45, scaleX: 1 } : { y: 0, rotate: 0, scaleX: [1, 0.65, 1, 1] }}
              transition={open ? { type: 'spring', stiffness: 420, damping: 18 } : { default: { type: 'spring', stiffness: 420, damping: 18 }, scaleX: { duration: 3.2, repeat: Infinity, delay: 0.5 } }}
            />
          </span>
        </motion.button>
      </div>
    </>
  );
}
