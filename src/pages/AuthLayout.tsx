import { BellRing, CalendarDays, CheckCircle2, ClipboardList, GraduationCap, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';
import { useReducedMotion } from '../lib/motion';
import type { ReactNode } from 'react';
import { Logo } from '../components/Logo';
import styles from './AuthLayout.module.css';

/* Fichas flotantes decorativas: solo iconos y rótulos, sin cifras inventadas. */
const FLOATERS = [
  { icon: CalendarDays, label: 'Entregas', x: '8%', y: '18%', delay: 0 },
  { icon: CheckCircle2, label: 'Notas', x: '70%', y: '12%', delay: 1.2 },
  { icon: BellRing, label: 'Novedades', x: '78%', y: '70%', delay: 0.6 },
  { icon: GraduationCap, label: 'Materias', x: '6%', y: '72%', delay: 1.8 },
  { icon: ClipboardList, label: 'Actividades', x: '40%', y: '84%', delay: 0.3 },
];

export function AuthLayout({ children }: { children: ReactNode }) {
  const reduce = useReducedMotion();
  return (
    <div className={styles.page}>
      <div className={styles.backdrop} aria-hidden="true">
        <span className={styles.blob1} /><span className={styles.blob2} /><span className={styles.blob3} />
        {FLOATERS.map(({ icon: Icon, label, x, y, delay }) => (
          <motion.span key={label} className={styles.floater} style={{ left: x, top: y }}
            initial={reduce ? false : { opacity: 0, y: 16 }} animate={reduce ? { opacity: 1 } : { opacity: 1, y: [0, -10, 0] }}
            transition={reduce ? { duration: 0 } : { opacity: { duration: 0.6, delay }, y: { duration: 5 + delay, repeat: Infinity, ease: 'easeInOut', delay } }}>
            <Icon size={18} aria-hidden="true" />{label}
          </motion.span>
        ))}
      </div>

      <motion.div className={styles.card} initial={reduce ? false : { opacity: 0, y: 18, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}>
        <div className={styles.brand}><Logo size={36} /></div>
        <p className={styles.tagline}><Sparkles size={14} aria-hidden="true" />Tu ciclo, claro de un vistazo</p>
        {children}
      </motion.div>
      <p className={styles.foot}>Academic Hub no es un servicio oficial de la universidad.</p>
    </div>
  );
}

export { styles as authStyles };
