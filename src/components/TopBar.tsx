import { BellRing, Menu, RefreshCw, Search } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Term } from '../api/types';
import { capitalize, dayFromKey, dayKey, formatRelative, formatDateTime } from '../lib/format';
import { useReducedMotion } from '../lib/motion';
import type { Tone } from '../lib/status';
import { LogoMark } from './Logo';
import styles from './TopBar.module.css';

const ease = [0.22, 1, 0.36, 1] as const;
const cx = (...names: Array<string | false | null | undefined>) => names.filter(Boolean).join(' ');
const weekday = new Intl.DateTimeFormat('es-SV', { timeZone: 'UTC', weekday: 'long' });
const monthShort = new Intl.DateTimeFormat('es-SV', { timeZone: 'UTC', month: 'short' });
const monthLong = new Intl.DateTimeFormat('es-SV', { timeZone: 'UTC', month: 'long' });
const HINTS = ['materias', 'actividades', 'notas', 'fechas de entrega'];
const DAY_MS = 86_400_000;

/**
 * Barra superior: fecha como hoja de calendario con la semana del ciclo, buscador que se expande y cambia de pista,
 * estado de la última importación y campana con el número real de novedades. Entra deslizándose, se compacta al hacer
 * scroll y todo lo interactivo responde al mouse.
 */
export function TopBar({ term, institution, lastImport, syncLabel, syncTone, news, onSearch, onMenu, menuOpen }: {
  term?: Term; institution?: string; lastImport: string | null; syncLabel: string; syncTone: Tone; news: number;
  onSearch: () => void; onMenu: () => void; menuOpen: boolean;
}) {
  const reduce = useReducedMotion();
  const [scrolled, setScrolled] = useState(false);
  const [hint, setHint] = useState(0);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 6);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  useEffect(() => { const id = window.setInterval(() => setHint((n) => (n + 1) % HINTS.length), 3200); return () => window.clearInterval(id); }, []);

  const key = dayKey(new Date());
  const date = dayFromKey(key);
  const start = term?.startAt ? Date.parse(term.startAt) : NaN;
  const end = term?.endAt ? Date.parse(term.endAt) : NaN;
  const weeks = Number.isFinite(start) && Number.isFinite(end) ? Math.max(1, Math.ceil((end - start) / (7 * DAY_MS))) : 0;
  const week = weeks ? Math.min(weeks, Math.max(1, Math.ceil((Date.now() - start) / (7 * DAY_MS)))) : 0;
  const part = (delay: number) => ({ initial: reduce ? false : { opacity: 0, y: -14 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.5, delay, ease } });
  const badge = news > 9 ? '9+' : String(news);

  return (
    <motion.header className={cx(styles.bar, scrolled && styles.scrolled)} initial={reduce ? false : { y: -72, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.55, ease }}>
      <motion.div {...part(0.05)}>
        <Link to="/dashboard" className={styles.logo}><LogoMark size={32} /><span>Academic Hub</span></Link>
      </motion.div>

      <motion.div className={styles.date} {...part(0.12)}>
        <span className={styles.leaf} aria-hidden="true"><b>{monthShort.format(date).replace('.', '')}</b><strong className="tabular">{Number(key.slice(8))}</strong></span>
        <span className={styles.dateText}>
          <strong>{capitalize(weekday.format(date))}</strong>
          <span>
            {capitalize(monthLong.format(date))}{term ? ` · ${term.name}` : ''}{institution ? ` · ${institution}` : ''}
            {week > 0 && <em className={styles.week}>Semana <b className="tabular">{week}</b>/{weeks}</em>}
          </span>
        </span>
      </motion.div>

      <motion.button type="button" className={styles.search} onClick={onSearch} aria-label="Buscar en Academic Hub" {...part(0.2)}>
        <span className={styles.searchIcon}><Search size={17} aria-hidden="true" /></span>
        <span className={styles.hint}>
          Buscar{' '}
          <span className={styles.hintWord}>
            <AnimatePresence mode="wait" initial={false}>
              <motion.span key={HINTS[hint]} initial={reduce ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.22, ease }}>{HINTS[hint]}…</motion.span>
            </AnimatePresence>
          </span>
        </span>
        <kbd>Ctrl K</kbd>
      </motion.button>

      <div className={styles.right}>
        <motion.span className={cx(styles.sync, styles[`sync-${syncTone}`])} title={lastImport ? `Última importación: ${formatDateTime(lastImport)}` : syncLabel} {...part(0.28)}>
          <RefreshCw size={14} aria-hidden="true" />{lastImport ? `Datos ${formatRelative(lastImport)}` : syncLabel}
        </motion.span>
        <motion.div {...part(0.34)}>
          <Link to="/updates" className={styles.bell} aria-label={news > 0 ? `Novedades: ${news}` : 'Novedades'}>
            <BellRing size={20} aria-hidden="true" />
            <AnimatePresence>
              {news > 0 && <motion.span className={styles.badge} aria-hidden="true" initial={reduce ? false : { scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} transition={{ type: 'spring', stiffness: 520, damping: 22, delay: 0.7 }}>{badge}</motion.span>}
            </AnimatePresence>
          </Link>
        </motion.div>
        <motion.button type="button" className={cx(styles.bell, styles.menu)} onClick={onMenu} aria-label="Abrir menú" aria-expanded={menuOpen} {...part(0.4)}>
          <Menu size={22} aria-hidden="true" />
        </motion.button>
      </div>
    </motion.header>
  );
}
