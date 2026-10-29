import { BellRing, CalendarDays, Check, FolderOpen, Sparkles, Target } from 'lucide-react';
import { motion } from 'motion/react';
import { useReducedMotion } from '../lib/motion';
import type { ReactNode } from 'react';
import { Logo } from '../components/Logo';
import styles from './AuthLayout.module.css';

const EASE = [0.22, 1, 0.36, 1] as const;

/* Lo que ofrece la app, sin cifras inventadas: solo rótulos. */
const FEATURES = [
  { icon: CalendarDays, title: 'Entregas al día', text: 'Cada actividad con su fecha, en un solo calendario.' },
  { icon: Target, title: 'Tu ciclo y tu meta', text: 'Las 5 evaluaciones y cuánto llevas para aprobar.' },
  { icon: FolderOpen, title: 'Archivos y guías', text: 'Léelos aquí, tal cual, y márcalos como leídos.' },
  { icon: BellRing, title: 'Novedades', text: 'Notas, anuncios y cambios apenas se actualizan.' },
];

export function AuthLayout({ children }: { children: ReactNode }) {
  const reduce = useReducedMotion();
  return (
    <div className={styles.page}>
      <div className={styles.backdrop} aria-hidden="true">
        <span className={styles.blob1} /><span className={styles.blob2} /><span className={styles.blob3} />
      </div>

      <div className={styles.shell}>
        <aside className={styles.hero} aria-label="Qué es Academic Hub">
          <motion.div initial={reduce ? false : { opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, ease: EASE }}>
            <div className={styles.heroBrand}><Logo size={40} /></div>
            <p className={styles.heroKicker}><Sparkles size={14} aria-hidden="true" />Tu ciclo, claro de un vistazo</p>
            <h2 className={styles.heroTitle}>Todo tu semestre, <em>sin perder el hilo</em>.</h2>
            <p className={styles.heroText}>Reúne tus materias, entregas, notas y archivos del campus virtual en un solo lugar, y mira cuánto te falta para la meta de cada evaluación.</p>
          </motion.div>

          <ol className={styles.track} aria-hidden="true">
            {[1, 2, 3, 4, 5].map((n) => (
              <motion.li key={n} className={styles.node} initial={reduce ? false : { opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'spring', stiffness: 260, damping: 18, delay: 0.35 + n * 0.09 }}>
                <span>{n <= 2 ? <Check size={15} strokeWidth={3.2} /> : n}</span>
                <small>Eval. {n}</small>
              </motion.li>
            ))}
          </ol>

          <ul className={styles.features}>
            {FEATURES.map(({ icon: Icon, title, text }, index) => (
              <motion.li key={title} initial={reduce ? false : { opacity: 0, x: -14 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.45, ease: EASE, delay: 0.5 + index * 0.08 }}>
                <span className={styles.featureIcon}><Icon size={19} aria-hidden="true" /></span>
                <span><strong>{title}</strong><small>{text}</small></span>
              </motion.li>
            ))}
          </ul>
        </aside>

        <motion.div className={styles.card} initial={reduce ? false : { opacity: 0, y: 18, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5, ease: EASE, delay: 0.1 }}>
          <div className={styles.brand}><Logo size={36} /></div>
          <p className={styles.tagline}><Sparkles size={14} aria-hidden="true" />Tu ciclo, claro de un vistazo</p>
          {children}
        </motion.div>
      </div>
      <p className={styles.foot}>Academic Hub no es un servicio oficial de la universidad.</p>
    </div>
  );
}

export { styles as authStyles };
