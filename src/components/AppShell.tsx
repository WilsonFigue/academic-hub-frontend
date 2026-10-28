import {
  BellRing, BookOpen, CalendarDays, ClipboardList, GraduationCap, House, LogOut, Menu, UserRound, X, type LucideIcon,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useReducedMotion } from '../lib/motion';
import { useEffect, useState, type ReactNode } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useDashboard, useLogout, useMe, useSession, useTerms } from '../api/hooks';
import { syncStatus } from '../lib/status';
import { CommandPalette } from './CommandPalette';
import { TopBar } from './TopBar';
import { SideRail } from './SideRail';
import styles from './AppShell.module.css';

type Item = { to: string; label: string; icon: LucideIcon };
const PRIMARY: Item[] = [
  { to: '/dashboard', label: 'Hoy', icon: House },
  { to: '/courses', label: 'Materias', icon: GraduationCap },
  { to: '/activities', label: 'Actividades', icon: ClipboardList },
  { to: '/calendar', label: 'Calendario', icon: CalendarDays },
  { to: '/grades', label: 'Calificaciones', icon: BookOpen },
  { to: '/updates', label: 'Novedades', icon: BellRing },
];
const DOCK = [PRIMARY[0]!, PRIMARY[1]!, PRIMARY[3]!, PRIMARY[2]!];

function initials(name: string | null | undefined, fallback: string) {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean);
  return parts.length ? (parts[0]![0]! + (parts[1]?.[0] ?? '')).toUpperCase() : fallback.slice(0, 2).toUpperCase();
}

/** Enlace de la hoja de navegación (≤1100 px): icono y etiqueta; la elegida lleva una píldora que se desliza. */
function SheetLink({ item, active, onClick }: { item: Item; active: boolean; onClick?: () => void }) {
  const Icon = item.icon;
  return (
    <NavLink to={item.to} className={styles.railItem} onClick={onClick}>
      {active && <motion.span layoutId="sheet-active" className={styles.railActive} transition={{ type: 'spring', stiffness: 480, damping: 38 }} />}
      <Icon size={22} strokeWidth={active ? 2.2 : 1.8} aria-hidden="true" />
      <span>{item.label}</span>
    </NavLink>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const reduce = useReducedMotion();
  const session = useSession();
  const me = useMe();
  const terms = useTerms();
  const dashboard = useDashboard();
  const logout = useLogout();
  const [sheet, setSheet] = useState(false);
  const [palette, setPalette] = useState(false);

  const user = session.data?.user;
  const account = me.data?.universityAccounts[0];
  const term = terms.data?.find((t) => t.isPreferredCurrent || t.isCurrentByDate) ?? terms.data?.[0];
  const lastImport = account?.lastSuccessfulSyncAt ?? dashboard.data?.lastSync?.finishedAt ?? null;
  const sync = syncStatus(dashboard.data?.lastSync?.status);
  const isActive = (to: string) => location.pathname === to || location.pathname.startsWith(`${to}/`);

  useEffect(() => { setSheet(false); }, [location.pathname]);
  useEffect(() => {
    document.body.style.overflow = sheet ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [sheet]);

  // Grupos del menú lateral, cada sección con su color; los contadores salen de datos reales del Inicio.
  const pending = dashboard.data?.summary.pending ?? 0;
  const news = dashboard.data?.recentChanges.length ?? 0;
  const railGroups = [
    { label: 'Estudio', items: [
      { ...PRIMARY[0]!, tone: 'var(--accent)' }, { ...PRIMARY[1]!, tone: 'var(--teal)' },
      { ...PRIMARY[2]!, tone: 'var(--sky)', badge: pending }, { ...PRIMARY[3]!, tone: 'var(--amber)' },
    ] },
    { label: 'Seguimiento', items: [{ ...PRIMARY[4]!, tone: 'var(--mint)' }, { ...PRIMARY[5]!, tone: 'var(--pink)', badge: news }] },
  ];

  const signOut = () => logout.mutate(undefined, { onSettled: () => navigate('/login', { replace: true }) });

  return (
      <div className={styles.shell}>
        {/* Menú lateral (≥1101) */}
        <SideRail groups={railGroups} isActive={isActive} name={user?.displayName ?? user?.username ?? 'Mi cuenta'} initials={initials(user?.displayName, user?.username ?? user?.email ?? 'AH')}
          profileActive={isActive('/profile')} onLogout={signOut} loggingOut={logout.isPending} />

        {/* Barra superior */}
        <TopBar term={term} institution={account?.institutionCode} lastImport={lastImport} syncLabel={sync.label} syncTone={sync.tone}
          news={dashboard.data?.recentChanges.length ?? 0} onSearch={() => setPalette(true)} onMenu={() => setSheet(true)} menuOpen={sheet} />

        {/* Hoja de navegación (≤1100) */}
        <AnimatePresence>
          {sheet && (
            <>
              <motion.button type="button" className={styles.overlay} aria-label="Cerrar menú" onClick={() => setSheet(false)}
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }} />
              <motion.nav className={styles.sheet} aria-label="Menú" initial={reduce ? false : { x: 40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 40, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 420, damping: 38 }}>
                <div className={styles.sheetHead}>
                  <span className={styles.avatar}>{initials(user?.displayName, user?.username ?? user?.email ?? 'AH')}</span>
                  <div style={{ minWidth: 0 }}>
                    <p className={styles.sheetName}>{user?.displayName ?? user?.username}</p>
                    <p className={styles.sheetMeta}>{user?.email}</p>
                  </div>
                  <button type="button" className={styles.iconButton} onClick={() => setSheet(false)} aria-label="Cerrar"><X size={20} aria-hidden="true" /></button>
                </div>
                <div className={styles.sheetItems}>
                  {[...PRIMARY, { to: '/profile', label: 'Mi perfil', icon: UserRound }].map((item) => (
                    <SheetLink key={item.to} item={item} active={isActive(item.to)} onClick={() => setSheet(false)} />
                  ))}
                </div>
                <button type="button" className={styles.sheetLogout} onClick={signOut}><LogOut size={18} aria-hidden="true" />Cerrar sesión</button>
              </motion.nav>
            </>
          )}
        </AnimatePresence>

        {/* Dock flotante (≤768) */}
        <nav className={styles.dock} aria-label="Principal">
          {DOCK.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.to);
            return (
              <NavLink key={item.to} to={item.to} className={styles.dockItem}>
                {active && <motion.span layoutId="dock-active" className={styles.dockActive} transition={{ type: 'spring', stiffness: 480, damping: 38 }} />}
                <Icon size={22} aria-hidden="true" /><span>{item.label}</span>
              </NavLink>
            );
          })}
          <button type="button" className={styles.dockItem} onClick={() => setSheet(true)} aria-label="Más">
            <Menu size={22} aria-hidden="true" /><span>Más</span>
          </button>
        </nav>

        <main id="main" className={styles.main} tabIndex={-1}>
          <AnimatePresence mode="wait">
            <motion.div key={location.pathname} className={styles.content}
              initial={reduce ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={reduce ? undefined : { opacity: 0, y: -6 }}
              transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}>
              {children}
            </motion.div>
          </AnimatePresence>
        </main>

        <CommandPalette open={palette} onOpenChange={setPalette} />
      </div>
  );
}
