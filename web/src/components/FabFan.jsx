import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Plus } from 'lucide-react';

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
        <motion.button
          type="button"
          className="fab-main"
          aria-label={open ? 'Tutup menu' : 'Buka menu'}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          animate={{ rotate: open ? 135 : 0 }}
          transition={{ type: 'spring', stiffness: 380, damping: 18 }}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.88, y: 3 }}
        >
          <Plus size={28} strokeWidth={3} />
        </motion.button>
      </div>
    </>
  );
}
