import { ArrowLeft, ArrowUpRight, BarChart3, CalendarClock, CalendarOff, CircleCheck, Clock, FolderOpen, GraduationCap, Info, ListChecks, Megaphone, MessageSquare, MessagesSquare, RefreshCw, Send, TriangleAlert, type LucideIcon } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { Activity, Course } from '../api/types';
import { courseIcon } from '../lib/courseIcon';
import { STATUS_INFO, STATUS_ORDER, averagePct, statusKeyOf, type DashStatus, type StatusKey } from '../lib/dashFilters';
import { TIMEZONE, courseTitle, formatDueRelative, formatTime } from '../lib/format';
import { useReducedMotion } from '../lib/motion';
import { activityStatus } from '../lib/status';
import { tintFor } from '../lib/tint';
import { Badge } from './ui';
import styles from './CourseHero.module.css';

const ease = [0.22, 1, 0.36, 1] as const;
const segColor = (key: StatusKey) => (key === 'pending' ? 'var(--st-pending)' : STATUS_INFO[key].color);
const cx = (...names: Array<string | false | null | undefined>) => names.filter(Boolean).join(' ');

const STATUS_ICON: Record<StatusKey, LucideIcon> = { pending: Clock, overdue: TriangleAlert, submitted: Send, graded: CircleCheck, nodate: CalendarOff };

export type CourseTab = 'activities' | 'content' | 'grades' | 'cycles' | 'info';
const TAB_ICONS: Record<CourseTab, LucideIcon> = { activities: ListChecks, content: FolderOpen, grades: BarChart3, cycles: RefreshCw, info: Info };

/** Cabecera de la materia: icono y color del tema, cinta con todas sus actividades por estado y la próxima entrega. */
export function CourseHero({ course, activities, contentCount, status, onStatus, onOpen, onTab, action }: {
  course: Course; activities: Activity[]; contentCount: number | undefined; status: DashStatus;
  onStatus: (status: DashStatus) => void; onOpen: (activity: Activity) => void; onTab: (tab: CourseTab) => void; action?: ReactNode;
}) {
  const reduce = useReducedMotion();
  const [hover, setHover] = useState<Activity | null>(null);
  const title = courseTitle(course.displayName ?? course.name);
  const tone = tintFor(course.id);
  const Icon = courseIcon(title);
  const now = Date.now();
  const next = activities.filter((a) => statusKeyOf(a) === 'pending' && a.dueAt && Date.parse(a.dueAt) >= now)
    .sort((a, b) => Date.parse(a.dueAt!) - Date.parse(b.dueAt!))[0];
  const avg = averagePct(activities);
  const total = activities.length;
  const counts = STATUS_ORDER.map((key) => ({ key, n: activities.filter((a) => statusKeyOf(a) === key).length })).filter((c) => c.n > 0);
  const shownAct = hover ?? next ?? null;

  return (
    <div>
      <Link to="/courses" className={styles.back}><ArrowLeft size={16} aria-hidden="true" />Mis materias</Link>
      <motion.header className={styles.hero} style={{ ['--c' as string]: tone.fg, ['--cbg' as string]: tone.bg }}
        initial={reduce ? false : { opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, ease }}>
        <Icon className={styles.mark} size={260} strokeWidth={1} aria-hidden="true" />
        <div className={styles.top}>
          <motion.span className={styles.disc} aria-hidden="true" initial={reduce ? false : { scale: 0.4, rotate: -24, opacity: 0 }} animate={{ scale: 1, rotate: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 320, damping: 18, delay: 0.15 }}>
            <Icon size={38} strokeWidth={1.8} />
          </motion.span>
          <div className={styles.id}>
            <motion.h1 initial={reduce ? false : { opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.2, ease }}>{title}</motion.h1>
            <motion.div className={styles.chips} initial={reduce ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3, ease }}>
              <span>{course.term?.name ?? 'Sin período'}</span>
              {course.courseCode && <span>{course.courseCode}</span>}
              <span><Badge tone={course.isAvailable === false ? 'neutral' : 'success'}>{course.isAvailable === false ? 'No disponible' : 'Disponible'}</Badge></span>
            </motion.div>
          </div>
          {action}
        </div>

        {total > 0 && (
          <div className={styles.glance}>
            <p className={styles.ribbonHint}><span>Cada bloque es una actividad, por fecha de entrega</span><span aria-hidden="true">más antiguas → más recientes</span></p>
            <div className={styles.ribbon} onPointerLeave={() => setHover(null)} role="group" aria-label="Actividades de la materia por estado">
              {activities.map((a, i) => {
                const key = statusKeyOf(a);
                const dim = status !== 'all' && !(status === key || (status === 'low' && key === 'graded'));
                return (
                  <motion.button key={a.id} type="button" className={cx(styles.seg, hover?.id === a.id && styles.segOn, dim && styles.segDim, next?.id === a.id && styles.segNext)} style={{ ['--s' as string]: segColor(key) }}
                    onClick={() => onOpen(a)} onPointerEnter={() => setHover(a)} onFocus={() => setHover(a)} onBlur={() => setHover(null)} aria-label={`${a.effectiveName ?? a.name}, ${activityStatus(a).label}`}
                    initial={reduce ? false : { scaleY: 0, opacity: 0 }} animate={{ scaleY: 1, opacity: 1 }} transition={{ duration: 0.45, delay: 0.35 + i * 0.03, ease }}>
                    {a.dueAt && total <= 16 && <><b className="tabular">{new Date(a.dueAt).toLocaleDateString('es-SV', { day: 'numeric', timeZone: TIMEZONE })}</b><i>{new Date(a.dueAt).toLocaleDateString('es-SV', { month: 'short', timeZone: TIMEZONE }).replace('.', '')}</i></>}
                  </motion.button>
                );
              })}
            </div>
            <div className={styles.caption} aria-live="polite">
              <AnimatePresence mode="wait">
                <motion.span key={shownAct?.id ?? 'none'} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, transition: { duration: 0.1 } }} transition={{ duration: 0.2, ease }}>
                  {shownAct ? (
                    <><i style={{ background: segColor(statusKeyOf(shownAct)) }} /><b>{shownAct.effectiveName ?? shownAct.name}</b>
                      <em>{hover ? activityStatus(shownAct).label : 'Próxima entrega'}{shownAct.dueAt ? ` · ${formatDueRelative(shownAct.dueAt)} · ${formatTime(shownAct.dueAt)}` : ''}</em></>
                  ) : <em>No hay entregas próximas en esta materia.</em>}
                </motion.span>
              </AnimatePresence>
            </div>
            <div className={styles.legend}>
              {counts.map(({ key, n }, i) => { const StatusIcon = STATUS_ICON[key]; return (
                <motion.button key={key} type="button" className={cx(styles.tag, status === key && styles.tagOn)} style={{ ['--s' as string]: STATUS_INFO[key].color }} aria-pressed={status === key} aria-label={`${STATUS_INFO[key].label}: ${n}`} data-tip={STATUS_INFO[key].label}
                  onClick={() => { onStatus(status === key ? 'all' : key); onTab('activities'); }}
                  initial={reduce ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.6 + i * 0.06, ease }}>
                  <StatusIcon size={19} aria-hidden="true" /><b className="tabular">{n}</b>
                </motion.button>
              ); })}
              <span className={styles.spacer} />
              {avg !== null && (
                <motion.button type="button" className={styles.stat} onClick={() => onTab('grades')} initial={reduce ? false : { opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4, delay: 0.7, ease }}>
                  <BarChart3 size={15} aria-hidden="true" /><span>Promedio</span><strong className="tabular">{Math.round(avg)}%</strong><ArrowUpRight size={14} aria-hidden="true" />
                </motion.button>
              )}
              {next && (
                <motion.button type="button" className={styles.stat} onClick={() => onOpen(next)} initial={reduce ? false : { opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4, delay: 0.76, ease }}>
                  <CalendarClock size={15} aria-hidden="true" /><span>Próxima</span><strong>{formatDueRelative(next.dueAt)}</strong><ArrowUpRight size={14} aria-hidden="true" />
                </motion.button>
              )}
              {contentCount !== undefined && contentCount > 0 && (
                <motion.button type="button" className={styles.stat} onClick={() => onTab('content')} initial={reduce ? false : { opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4, delay: 0.82, ease }}>
                  <FolderOpen size={15} aria-hidden="true" /><span>Contenido</span><strong className="tabular">{contentCount}</strong><ArrowUpRight size={14} aria-hidden="true" />
                </motion.button>
              )}
              {blackboardNews(course).map((news, index) => (
                <motion.a key={news.label} className={styles.stat} href={course.lmsUrl ?? undefined} target="_blank" rel="noopener noreferrer"
                  title={`${news.count} ${news.label.toLowerCase()} sin ver en Blackboard`}
                  initial={reduce ? false : { opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4, delay: 0.88 + index * 0.06, ease }}>
                  <news.icon size={15} aria-hidden="true" /><span>{news.label}</span><strong className="tabular">{news.count}</strong><ArrowUpRight size={14} aria-hidden="true" />
                  <span className="visually-hidden"> (se abre en otra pestaña)</span>
                </motion.a>
              ))}
            </div>
          </div>
        )}
      </motion.header>
    </div>
  );
}

/** Pestañas de la materia: icono por sección, contador y una línea de color que se desliza. */
export function CourseSections({ tab, tabs, onChange }: { tab: CourseTab; tabs: Array<{ id: CourseTab; label: string; count?: number }>; onChange: (tab: CourseTab) => void }) {
  return (
    <div className={styles.tabs} role="tablist" aria-label="Secciones de la materia">
      {tabs.map((item, i) => {
        const Icon = TAB_ICONS[item.id];
        return (
          <motion.button key={item.id} type="button" role="tab" id={`tab-${item.id}`} aria-controls={`panel-${item.id}`} aria-selected={tab === item.id} className={styles.tab} onClick={() => onChange(item.id)}
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.3 + i * 0.05, ease }}>
            <Icon size={18} aria-hidden="true" />{item.label}{item.count !== undefined && <b className="tabular">{item.count}</b>}
            {tab === item.id && <motion.span layoutId="course-section" className={styles.line} transition={{ type: 'spring', stiffness: 500, damping: 40 }} />}
          </motion.button>
        );
      })}
    </div>
  );
}

/** Lo que Blackboard dice que el estudiante no ha visto en la materia (solo contadores capturados en la última actualización). */
function blackboardNews(course: Course): Array<{ label: string; count: number; icon: LucideIcon }> {
  const signals = course.signals;
  if (!signals) return [];
  return [
    { label: 'Notas nuevas', count: signals.unreadGrades ?? 0, icon: GraduationCap },
    { label: 'Mensajes', count: signals.conversationsUnread ?? 0, icon: MessageSquare },
    { label: 'Foros', count: signals.forumUnread ?? 0, icon: MessagesSquare },
    { label: 'Anuncios', count: signals.announcementsUnread ?? 0, icon: Megaphone },
  ].filter((item) => item.count > 0);
}
