import { BookOpen, Building2, CalendarDays, KeyRound, Link2, Mail, RefreshCw, ShieldCheck, TriangleAlert, UserRound } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useDashboard, useMe, useTerms } from '../api/hooks';
import { Badge, Button, Card, EmptyState, Skeleton, buttonClass } from '../components/ui';
import { formatDate, formatDateTime, formatRelative } from '../lib/format';
import { linkStatus } from '../lib/status';
import styles from './Profile.module.css';

function initials(name: string | null | undefined, fallback: string) {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean);
  return parts.length ? (parts[0]![0]! + (parts[1]?.[0] ?? '')).toUpperCase() : fallback.slice(0, 2).toUpperCase();
}

export function ProfilePage() {
  const { data, isPending, error, refetch } = useMe();
  const terms = useTerms();
  const dashboard = useDashboard();

  if (isPending) return <div className={styles.stack} aria-busy="true"><Skeleton height={220} radius={24} /><Skeleton height={260} radius={20} /></div>;
  if (error || !data) return <Card><EmptyState tone="danger" icon={<TriangleAlert />} title="No pudimos cargar tu perfil"
    action={<Button variant="secondary" onClick={() => refetch()}>Reintentar</Button>}>{error?.message}</EmptyState></Card>;

  const account = data.universityAccounts[0];
  const status = linkStatus(account?.linkStatus);
  const summary = dashboard.data?.summary;

  return (
    <div className={styles.stack}>
      <section className={styles.hero} aria-label="Tu cuenta">
        <span className={styles.avatar} aria-hidden="true">{initials(data.user.displayName, data.user.username ?? data.user.email)}</span>
        <div className={styles.heroText}>
          <h1 className={styles.name}>{data.user.displayName ?? data.user.username ?? 'Tu cuenta'}</h1>
          <p className={styles.handle}>{data.user.username ? `@${data.user.username} · ` : ''}{data.user.email}</p>
          <p className={styles.since}><CalendarDays size={14} aria-hidden="true" />En Academic Hub desde {formatDate(data.user.createdAt)}</p>
        </div>
        <Link to="/change-password" className={`${buttonClass('secondary')} ${styles.heroAction}`}><KeyRound size={18} aria-hidden="true" />Cambiar contraseña</Link>
        {summary && (
          <ul className={styles.stats}>
            <li><strong className="tabular">{summary.courses}</strong><span>materias</span></li>
            <li><strong className="tabular">{summary.activities}</strong><span>evaluables</span></li>
            <li><strong className="tabular">{summary.graded}</strong><span>calificadas</span></li>
            <li><strong className="tabular">{summary.pending}</strong><span>pendientes</span></li>
          </ul>
        )}
      </section>

      <div className={styles.grid}>
        <Card aria-labelledby="university-title">
          <div className={styles.cardHead}>
            <span className={styles.cardIcon}><Building2 size={20} aria-hidden="true" /></span>
            <div><h2 id="university-title" className={styles.cardTitle}>Cuenta universitaria</h2><p className={styles.cardSub}>Blackboard Learn Ultra</p></div>
            {account && <Badge tone={status.tone}>{status.label}</Badge>}
          </div>
          {!account ? (
            <EmptyState icon={<Link2 />} title="Sin cuenta universitaria vinculada">La vinculación con tu campus virtual se realiza mediante una importación autorizada.</EmptyState>
          ) : (
            <>
              <p className={styles.note}>{status.detail}</p>
              <dl className={styles.dl}>
                <div><dt><Building2 size={14} />Institución</dt><dd>{account.institutionName}</dd></div>
                <div><dt><UserRound size={14} />Nombre institucional</dt><dd>{[account.givenName, account.familyName].filter(Boolean).join(' ') || '—'}</dd></div>
                <div><dt><UserRound size={14} />Usuario de Blackboard</dt><dd>{account.lmsUsername ?? '—'}</dd></div>
                <div><dt><Mail size={14} />Correo institucional</dt><dd>{account.institutionalEmail ?? '—'}</dd></div>
                <div><dt><BookOpen size={14} />Materias activas</dt><dd className="tabular">{account.activeEnrollments}</dd></div>
                <div><dt><Link2 size={14} />Vinculada desde</dt><dd>{formatDate(account.linkedAt)}</dd></div>
              </dl>
              <div className={styles.timeline} aria-label="Historial de la vinculación">
                <div className={styles.step}><span className={styles.stepDot} /><div><p>Vinculada</p><small>{formatDateTime(account.linkedAt)}</small></div></div>
                <div className={styles.step}><span className={styles.stepDot} /><div><p>Identidad verificada</p><small>{formatDateTime(account.lastVerifiedAt)}</small></div></div>
                <div className={`${styles.step} ${styles.stepLast}`}><span className={styles.stepDot} /><div><p>Última importación correcta</p><small>{account.lastSuccessfulSyncAt ? `${formatDateTime(account.lastSuccessfulSyncAt)} (${formatRelative(account.lastSuccessfulSyncAt)})` : '—'}</small></div></div>
              </div>
              {terms.data && terms.data.length > 0 && (
                <p className={styles.note}><strong>Períodos:</strong> {terms.data.map((t) => `${t.name} (${t.courseCount} ${t.courseCount === 1 ? 'materia' : 'materias'})`).join(' · ')}</p>
              )}
            </>
          )}
        </Card>

        <div className={styles.stack}>
          <Card aria-labelledby="security-title">
            <div className={styles.cardHead}>
              <span className={`${styles.cardIcon} ${styles.cardIconMint}`}><ShieldCheck size={20} aria-hidden="true" /></span>
              <div><h2 id="security-title" className={styles.cardTitle}>Privacidad</h2><p className={styles.cardSub}>Qué guarda y qué no</p></div>
            </div>
            <ul className={styles.checks}>
              <li><ShieldCheck size={16} aria-hidden="true" />Tu contraseña del campus virtual no se usa ni se guarda aquí.</li>
              <li><ShieldCheck size={16} aria-hidden="true" />Academic Hub no mantiene una sesión abierta en Blackboard.</li>
              <li><ShieldCheck size={16} aria-hidden="true" />Solo lectura: nunca modifica entregas ni calificaciones.</li>
            </ul>
          </Card>
          <Card aria-labelledby="sync-title">
            <div className={styles.cardHead}>
              <span className={`${styles.cardIcon} ${styles.cardIconSky}`}><RefreshCw size={20} aria-hidden="true" /></span>
              <div><h2 id="sync-title" className={styles.cardTitle}>Actualización de datos</h2><p className={styles.cardSub}>Importaciones autorizadas</p></div>
            </div>
            <p className={styles.note}>Los datos se actualizan cuando se ejecuta una importación autorizada; todavía no hay sincronización automática.</p>
          </Card>
        </div>
      </div>
    </div>
  );
}
