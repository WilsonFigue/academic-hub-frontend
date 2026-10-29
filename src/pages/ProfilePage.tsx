import {
  ArrowUpRight, BookOpen, Building2, CalendarDays, Check, CheckCircle2, ClipboardList, Clock, Copy, GraduationCap, KeyRound, Link2, Lock, Mail, RefreshCw, ShieldCheck, TriangleAlert, UserRound, type LucideIcon,
} from 'lucide-react';
import { animate, motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useDashboard, useMe, useTerms } from '../api/hooks';
import { ChangePasswordModal } from '../components/ChangePasswordModal';
import { Badge, Button, Card, EmptyState, Skeleton } from '../components/ui';
import { formatDate, formatDateTime, formatRelative } from '../lib/format';
import { useReducedMotion } from '../lib/motion';
import { linkStatus } from '../lib/status';
import styles from './Profile.module.css';

const ease = [0.22, 1, 0.36, 1] as const;

function initials(name: string | null | undefined, fallback: string) {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean);
  return parts.length ? (parts[0]![0]! + (parts[1]?.[0] ?? '')).toUpperCase() : fallback.slice(0, 2).toUpperCase();
}

/** Solo presentación: un nombre todo en mayúsculas se muestra con mayúscula inicial. */
function niceName(name: string): string {
  if (name !== name.toLocaleUpperCase('es')) return name;
  return name.toLocaleLowerCase('es').split(/\s+/).map((w) => (['de', 'del', 'la', 'las', 'y'].includes(w) ? w : w.charAt(0).toLocaleUpperCase('es') + w.slice(1))).join(' ');
}

function Count({ value }: { value: number }) {
  const reduce = useReducedMotion();
  const [shown, setShown] = useState(reduce ? value : 0);
  const last = useRef(reduce ? value : 0);
  useEffect(() => {
    if (reduce) { setShown(value); last.current = value; return; }
    const controls = animate(last.current, value, { duration: 0.9, ease, onUpdate: (v) => { last.current = v; setShown(Math.round(v)); } });
    return () => controls.stop();
  }, [value, reduce]);
  return <>{shown}</>;
}

/** Valor con botón para copiarlo al portapapeles. */
function Copyable({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(value); setCopied(true); window.setTimeout(() => setCopied(false), 1500); } catch { /* sin permiso de portapapeles */ }
  };
  return (
    <button type="button" className={styles.copy} onClick={copy} aria-label={`Copiar ${label}`}>
      <span>{value}</span>
      <i aria-hidden="true">{copied ? <Check size={13} /> : <Copy size={13} />}</i>
      <b role="status">{copied ? 'Copiado' : ''}</b>
    </button>
  );
}

function Tile({ icon: Icon, label, children, color, index }: { icon: LucideIcon; label: string; children: React.ReactNode; color: string; index: number }) {
  const reduce = useReducedMotion();
  return (
    <motion.div className={styles.tile} style={{ ['--k' as string]: color }} initial={reduce ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.2 + index * 0.05, ease }}>
      <span className={styles.tileIcon}><Icon size={18} aria-hidden="true" /></span>
      <span className={styles.tileText}><small>{label}</small><strong>{children}</strong></span>
    </motion.div>
  );
}

export function ProfilePage() {
  const { data, isPending, error, refetch } = useMe();
  const terms = useTerms();
  const dashboard = useDashboard();
  const reduce = useReducedMotion();
  const [pwOpen, setPwOpen] = useState(false);

  if (isPending) return <div className={styles.stack} aria-busy="true"><Skeleton height={260} radius={32} /><Skeleton height={300} radius={28} /></div>;
  if (error || !data) return <Card><EmptyState tone="danger" icon={<TriangleAlert />} title="No pudimos cargar tu perfil"
    action={<Button variant="secondary" onClick={() => refetch()}>Reintentar</Button>}>{error?.message}</EmptyState></Card>;

  const account = data.universityAccounts[0];
  const status = linkStatus(account?.linkStatus);
  const summary = dashboard.data?.summary;
  const display = niceName(data.user.displayName ?? data.user.username ?? 'Tu cuenta');
  const stats: Array<{ icon: LucideIcon; value: number; label: string; to: string; color: string }> = summary ? [
    { icon: GraduationCap, value: summary.courses, label: 'materias', to: '/courses', color: '#7dd3c0' },
    { icon: ClipboardList, value: summary.activities, label: 'evaluables', to: '/activities', color: '#9bb8ff' },
    { icon: CheckCircle2, value: summary.graded, label: 'calificadas', to: '/grades', color: '#86efac' },
    { icon: Clock, value: summary.pending, label: 'pendientes', to: '/activities', color: '#fbbf6a' },
  ] : [];
  const steps = account ? [
    { title: 'Vinculada', when: formatDateTime(account.linkedAt) },
    { title: 'Identidad verificada', when: formatDateTime(account.lastVerifiedAt) },
    { title: 'Última importación correcta', when: account.lastSuccessfulSyncAt ? `${formatDateTime(account.lastSuccessfulSyncAt)} · ${formatRelative(account.lastSuccessfulSyncAt)}` : '—' },
  ] : [];

  return (
    <div className={styles.stack}>
      <motion.section className={styles.hero} aria-label="Tu cuenta" initial={reduce ? false : { opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, ease }}>
        <motion.span className={styles.avatar} aria-hidden="true" initial={reduce ? false : { scale: 0.5, rotate: -16, opacity: 0 }} animate={{ scale: 1, rotate: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 18, delay: 0.1 }}>
          {initials(data.user.displayName, data.user.username ?? data.user.email)}
        </motion.span>
        <div className={styles.heroText}>
          <h1 className={styles.name}>{display}</h1>
          <p className={styles.handles}>
            {data.user.username && <span className={styles.handle}><UserRound size={14} aria-hidden="true" />@{data.user.username}</span>}
            <span className={styles.handle}><Mail size={14} aria-hidden="true" />{data.user.email}</span>
          </p>
          <p className={styles.since}><CalendarDays size={14} aria-hidden="true" />En Academic Hub desde {formatDate(data.user.createdAt)}</p>
        </div>
        <button type="button" className={styles.heroAction} onClick={() => setPwOpen(true)}><KeyRound size={18} aria-hidden="true" />Cambiar contraseña</button>
        {stats.length > 0 && (
          <ul className={styles.stats}>
            {stats.map((s, i) => (
              <motion.li key={s.label} initial={reduce ? false : { opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: 0.25 + i * 0.06, ease }}>
                <Link to={s.to} className={styles.stat} style={{ ['--k' as string]: s.color }}>
                  <span className={styles.statIcon}><s.icon size={19} aria-hidden="true" /></span>
                  <strong className="tabular"><Count value={s.value} /></strong>
                  <span>{s.label}</span>
                  <ArrowUpRight className={styles.statGo} size={15} aria-hidden="true" />
                </Link>
              </motion.li>
            ))}
          </ul>
        )}
      </motion.section>

      <div className={styles.grid}>
        <motion.section className={styles.panel} aria-labelledby="university-title" initial={reduce ? false : { opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.15, ease }}>
          <header className={styles.cardHead}>
            <span className={styles.cardIcon}><Building2 size={21} aria-hidden="true" /></span>
            <div><h2 id="university-title" className={styles.cardTitle}>Cuenta universitaria</h2><p className={styles.cardSub}>Blackboard Learn Ultra</p></div>
            {account && <Badge tone={status.tone}>{status.label}</Badge>}
          </header>
          {!account ? (
            <EmptyState icon={<Link2 />} title="Sin cuenta universitaria vinculada">La vinculación con tu campus virtual se realiza mediante una importación autorizada.</EmptyState>
          ) : (
            <>
              <p className={styles.note}>{status.detail}</p>
              <div className={styles.tiles}>
                <Tile index={0} icon={Building2} color="var(--accent)" label="Institución">{account.institutionName}</Tile>
                <Tile index={1} icon={UserRound} color="var(--sky)" label="Nombre institucional">{niceName([account.givenName, account.familyName].filter(Boolean).join(' ') || '—')}</Tile>
                <Tile index={2} icon={UserRound} color="var(--teal)" label="Usuario de Blackboard">{account.lmsUsername ? <Copyable value={account.lmsUsername} label="usuario de Blackboard" /> : '—'}</Tile>
                <Tile index={3} icon={Mail} color="var(--pink)" label="Correo institucional">{account.institutionalEmail ? <Copyable value={account.institutionalEmail} label="correo institucional" /> : '—'}</Tile>
                <Tile index={4} icon={BookOpen} color="var(--mint)" label="Materias activas"><span className="tabular">{account.activeEnrollments}</span></Tile>
                <Tile index={5} icon={Link2} color="var(--amber)" label="Vinculada desde">{formatDate(account.linkedAt)}</Tile>
              </div>
              <ol className={styles.timeline} aria-label="Historial de la vinculación">
                {steps.map((step, i) => (
                  <motion.li key={step.title} className={styles.step} initial={reduce ? false : { opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4, delay: 0.5 + i * 0.1, ease }}>
                    <span className={styles.stepDot}><Check size={12} aria-hidden="true" /></span>
                    <div><p>{step.title}</p><small>{step.when}</small></div>
                  </motion.li>
                ))}
              </ol>
              {terms.data && terms.data.length > 0 && (
                <div className={styles.terms}>
                  <small>Períodos</small>
                  <div>{terms.data.map((t) => <span key={t.id}>{t.name}<b className="tabular">{t.courseCount} {t.courseCount === 1 ? 'materia' : 'materias'}</b></span>)}</div>
                </div>
              )}
            </>
          )}
        </motion.section>

        <div className={styles.stack}>
          <motion.section className={styles.panel} aria-labelledby="pw-card-title" initial={reduce ? false : { opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.22, ease }}>
            <header className={styles.cardHead}>
              <span className={cx(styles.cardIcon, styles.cardIconAccent)}><Lock size={21} aria-hidden="true" /></span>
              <div><h2 id="pw-card-title" className={styles.cardTitle}>Seguridad</h2><p className={styles.cardSub}>Acceso a tu cuenta de Academic Hub</p></div>
            </header>
            <button type="button" className={styles.pwRow} onClick={() => setPwOpen(true)}>
              <span className={styles.pwIcon}><KeyRound size={19} aria-hidden="true" /></span>
              <span className={styles.pwText}><strong>Contraseña</strong><small>Cámbiala cuando quieras; no afecta tu cuenta de Blackboard.</small></span>
              <ArrowUpRight size={17} aria-hidden="true" />
            </button>
          </motion.section>

          <motion.section className={styles.panel} aria-labelledby="security-title" initial={reduce ? false : { opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.29, ease }}>
            <header className={styles.cardHead}>
              <span className={cx(styles.cardIcon, styles.cardIconMint)}><ShieldCheck size={21} aria-hidden="true" /></span>
              <div><h2 id="security-title" className={styles.cardTitle}>Privacidad</h2><p className={styles.cardSub}>Qué guarda y qué no</p></div>
            </header>
            <ul className={styles.checks}>
              {['Tu contraseña del campus virtual no se usa ni se guarda aquí.', 'Academic Hub no mantiene una sesión abierta en Blackboard.', 'Solo lectura: nunca modifica entregas ni calificaciones.'].map((text, i) => (
                <motion.li key={text} initial={reduce ? false : { opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4, delay: 0.45 + i * 0.08, ease }}>
                  <span><ShieldCheck size={15} aria-hidden="true" /></span>{text}
                </motion.li>
              ))}
            </ul>
          </motion.section>

          <motion.section className={styles.panel} aria-labelledby="sync-title" initial={reduce ? false : { opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.36, ease }}>
            <header className={styles.cardHead}>
              <span className={cx(styles.cardIcon, styles.cardIconSky)}><RefreshCw size={21} aria-hidden="true" /></span>
              <div><h2 id="sync-title" className={styles.cardTitle}>Actualización de datos</h2><p className={styles.cardSub}>Importaciones autorizadas</p></div>
            </header>
            <p className={styles.note}>Los datos se actualizan cuando se ejecuta una importación autorizada; todavía no hay sincronización automática.</p>
          </motion.section>
        </div>
      </div>
      <ChangePasswordModal open={pwOpen} onClose={() => setPwOpen(false)} />
    </div>
  );
}

function cx(...names: Array<string | false | null | undefined>) { return names.filter(Boolean).join(' '); }
