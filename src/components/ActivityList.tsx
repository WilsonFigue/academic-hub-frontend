import { motion } from 'motion/react';
import { useReducedMotion } from '../lib/motion';
import type { Activity } from '../api/types';
import { TIMEZONE, activityKind, categoryLabel, courseTitle, daysUntil, formatDueRelative, formatScore, formatTime } from '../lib/format';
import { Highlight } from './Filters';
import { activityStatus } from '../lib/status';
import { Badge } from './ui';
import styles from './ActivityList.module.css';

const day = new Intl.DateTimeFormat('es-SV', { timeZone: TIMEZONE, day: 'numeric' });
const month = new Intl.DateTimeFormat('es-SV', { timeZone: TIMEZONE, month: 'short' });
const weekday = new Intl.DateTimeFormat('es-SV', { timeZone: TIMEZONE, weekday: 'long' });

export function ActivityList({ activities, showCourse = true, showScore = false, onSelect, query = '' }: {
  activities: Activity[];
  showCourse?: boolean;
  showScore?: boolean;
  onSelect?: (activity: Activity) => void;
  query?: string;
}) {
  const reduce = useReducedMotion();
  return (
    <ul className={styles.list}>
      {activities.map((activity, index) => {
        const status = activityStatus(activity);
        const due = activity.dueAt ? new Date(activity.dueAt) : null;
        const isSoon = due !== null && due.getTime() >= Date.now() && daysUntil(activity.dueAt!) <= 3;
        const content = (
          <>
            <span className={`${styles.date} ${isSoon ? styles.dateSoon : ''}`} aria-hidden="true">
              {due ? (<><span className={`${styles.dateDay} tabular`}>{day.format(due)}</span><span className={styles.dateMonth}>{month.format(due).replace('.', '')}</span></>)
                : <span className={styles.dateMonth}>Sin<br />fecha</span>}
            </span>
            <span className={styles.body}>
              <span className={styles.title} style={{ display: 'block' }}><Highlight text={activity.effectiveName ?? activity.name} query={query} /></span>
              <span className={styles.meta}>
                {showCourse && <span>{courseTitle(activity.courseName)}</span>}
                <span>{activity.isCalculated ? 'Columna calculada' : categoryLabel(activity.categoryKey, activity.categoryTitle) ?? activityKind(activity.kind)}</span>
                {due && <span>{weekday.format(due)} {formatTime(activity.dueAt)} · {formatDueRelative(activity.dueAt)}</span>}
                {activity.dueSource === 'todo' && <span>Fecha personal</span>}
              </span>
            </span>
            <span className={styles.side}>
              {showScore && activity.score !== null && (
                <span className={`${styles.score} tabular`}>
                  {formatScore(activity.score)}{activity.pointsPossible !== null && <small> / {formatScore(activity.pointsPossible)}</small>}
                </span>
              )}
              <Badge tone={status.tone}>{status.label}</Badge>
            </span>
          </>
        );
        return (
          <motion.li key={activity.id} className={styles.item}
            initial={reduce ? false : { opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28, delay: Math.min(index, 8) * 0.035, ease: [0.22, 1, 0.36, 1] }}>
            {onSelect ? (
              <button type="button" className={styles.row} onClick={() => onSelect(activity)}
                aria-label={`${activity.effectiveName ?? activity.name}, ${status.label}${due ? `, vence ${due.toLocaleString('es-SV', { timeZone: TIMEZONE })}` : ''}`}>
                {content}
              </button>
            ) : <div className={styles.row}>{content}</div>}
          </motion.li>
        );
      })}
    </ul>
  );
}
