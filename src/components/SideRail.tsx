import { LogOut, type LucideIcon } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useReducedMotion } from '../lib/motion';
import { LogoMark } from './Logo';
import styles from './SideRail.module.css';

const ease = [0.22, 1, 0.36, 1] as const;
const cx = (...names: Array<string | false | null | undefined>) => names.filter(Boolean).join(' ');

export type RailItem = { to: string; label: string; icon: LucideIcon; tone: string; badge?: number };

/**
 * Menú lateral. Colapsado es un riel de iconos; al pasar el mouse (con un pequeño retardo) o enfocar con teclado se despliega
 * como un panel sobre el contenido, con etiquetas, grupos y datos reales (pendientes y novedades). Cada sección tiene su color:
 * la elegida lleva una píldora que se desliza entre secciones. Entra deslizándose y sus piezas llegan escalonadas.
 */
export function SideRail({ groups, isActive, name, initials, profileActive, onLogout, loggingOut }: {
  groups: Array<{ label: string; items: RailItem[] }>; isActive: (to: string) => boolean; name: string; initials: string;
  profileActive: boolean; onLogout: () => void; loggingOut: boolean;
}) {
  const reduce = useReducedMotion();
  const [open, setOpen] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const expand = () => { window.clearTimeout(timer.current); timer.current = window.setTimeout(() => setOpen(true), 130); };
  const collapse = () => { window.clearTimeout(timer.current); timer.current = window.setTimeout(() => setOpen(false), 240); };
  let index = 0;
  const step = () => 0.22 + index++ * 0.055;

  return (
    <nav className={styles.rail} aria-label="Principal"
      onPointerEnter={(event) => { if (event.pointerType === 'mouse') expand(); }} onPointerLeave={(event) => { if (event.pointerType === 'mouse') collapse(); }}
      onFocus={(event) => { if (event.target.matches(':focus-visible')) { window.clearTimeout(timer.current); setOpen(true); } }}
      onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) collapse(); }}>
      <motion.div className={cx(styles.panel, open && styles.open)} initial={reduce ? false : { x: -90, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ duration: 0.6, ease }}>
        <motion.div initial={reduce ? false : { opacity: 0, scale: 0.6, rotate: -20 }} animate={{ opacity: 1, scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 380, damping: 22, delay: 0.12 }}>
          <Link to="/dashboard" className={styles.brand} aria-label="Academic Hub, inicio">
            <span className={styles.iconBox}><LogoMark size={40} /></span>
            <span className={styles.brandText}><strong>Academic Hub</strong><small>Tu ciclo, claro</small></span>
          </Link>
        </motion.div>

        <ul className={styles.list}>
          {groups.map((group) => (
            <li key={group.label} className={styles.group}>
              <span className={styles.groupLabel}><span>{group.label}</span></span>
              <ul className={styles.items}>
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.to);
                  const count = item.badge ?? 0;
                  return (
                    <motion.li key={item.to} initial={reduce ? false : { opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.45, delay: step(), ease }}>
                      <NavLink to={item.to} className={styles.item} style={{ ['--t' as string]: item.tone, ['--i' as string]: index }} aria-label={count > 0 ? `${item.label}, ${count}` : item.label}>
                        {active && <motion.span layoutId="side-active" className={styles.pill} transition={{ type: 'spring', stiffness: 460, damping: 36 }} />}
                        <span className={styles.iconBox}><Icon size={22} strokeWidth={active ? 2.2 : 1.8} aria-hidden="true" /></span>
                        <span className={styles.label}>{item.label}</span>
                        <AnimatePresence>
                          {count > 0 && (
                            <motion.span className={styles.badge} aria-hidden="true" initial={reduce ? false : { scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} transition={{ type: 'spring', stiffness: 520, damping: 22, delay: 0.8 }}>
                              {count > 99 ? '99+' : count}
                            </motion.span>
                          )}
                        </AnimatePresence>
                      </NavLink>
                    </motion.li>
                  );
                })}
              </ul>
            </li>
          ))}
        </ul>

        <motion.div className={styles.foot} initial={reduce ? false : { opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.7, ease }}>
          <Link to="/profile" className={cx(styles.me, profileActive && styles.meActive)} aria-label="Mi perfil">
            <span className={styles.iconBox}><span className={styles.avatar}>{initials}</span></span>
            <span className={styles.label}><strong>{name}</strong><small>Mi perfil</small></span>
          </Link>
          <button type="button" className={styles.logout} onClick={onLogout} disabled={loggingOut} aria-label="Cerrar sesión">
            <span className={styles.iconBox}><LogOut size={20} aria-hidden="true" /></span>
            <span className={styles.label}>Cerrar sesión</span>
          </button>
        </motion.div>
      </motion.div>
    </nav>
  );
}
