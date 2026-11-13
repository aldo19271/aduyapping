import { motion } from 'framer-motion';

/**
 * Diagram lingkaran: tiap segmen { value, color, label }.
 * Bagian tengah menampilkan children (misalnya persen akurasi).
 */
export default function Donut({ segments, size = 190, stroke = 26, children }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const total = segments.reduce((a, s) => a + s.value, 0) || 1;
  let acc = 0;
  return (
    <div className="donut" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={segments.map((s) => `${s.label} ${s.value}`).join(', ')}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--line)" strokeWidth={stroke} />
        {segments.map((s, i) => {
          const gap = segments.filter((x) => x.value > 0).length > 1 ? 4 : 0;
          const len = Math.max(0, (s.value / total) * c - gap);
          const off = acc;
          acc += len;
          if (len <= 0) return null;
          return (
            <motion.circle
              key={s.label}
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={s.color}
              strokeWidth={stroke}
              strokeDasharray={`${len} ${c - len}`}
              strokeDashoffset={-off}
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
              initial={{ opacity: 0, strokeWidth: 0 }}
              animate={{ opacity: 1, strokeWidth: stroke }}
              transition={{ duration: 0.6, delay: 0.1 + i * 0.25 }}
            />
          );
        })}
      </svg>
      <div className="donut-center">{children}</div>
    </div>
  );
}
