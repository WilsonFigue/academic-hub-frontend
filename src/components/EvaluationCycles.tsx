import { CalendarDaysIcon, CheckCircleIcon, ExclamationTriangleIcon, MinusIcon, PlusIcon } from '@heroicons/react/24/outline';
import { AnimatePresence, motion } from 'motion/react';
import { useReducedMotion } from '../lib/motion';
import { useEffect, useMemo, useState } from 'react';
import { ApiError } from '../api/client';
import { useCycles, useSaveCycles } from '../api/hooks';
import type { Activity, EvaluationCycles as CyclesData } from '../api/types';
import { dayRange } from '../lib/evalDates';
import { activityKind, categoryLabel, formatScore, formatShortDate } from '../lib/format';
import { Badge, Button, EmptyState, Skeleton } from './ui';
import styles from './EvaluationCycles.module.css';

const CYCLE_COUNT = 5;
const cx = (...names: Array<string | false | null | undefined>) => names.filter(Boolean).join(' ');

interface CycleDraft {
  weightPercent: string;
  items: Array<{ activityId: string; weight: string }>;
}

type Draft = { active: number | null; cycles: Record<number, CycleDraft> };

function fromServer(data: CyclesData): Draft {
  const cycles: Record<number, CycleDraft> = {};
  for (let number = 1; number <= CYCLE_COUNT; number += 1) cycles[number] = { weightPercent: '', items: [] };
  for (const cycle of data.cycles) {
    cycles[cycle.number] = {
      weightPercent: cycle.weightPercent === null ? '' : String(Number(cycle.weightPercent)),
      items: data.items.filter((item) => item.cycleId === cycle.id)
        .map((item) => ({ activityId: item.activityId, weight: item.weightWithinCycle === null ? '' : String(Number(item.weightWithinCycle)) })),
    };
  }
  return { active: data.cycles.find((cycle) => cycle.isActive)?.number ?? null, cycles };
}

const toNumber = (value: string) => (value.trim() === '' ? null : Number(value));

/**
 * Las 5 evaluaciones de una materia. Las actividades llegan repartidas por el calendario oficial (según su fecha de entrega);
 * el estudiante puede moverlas y su configuración manual manda sobre la del calendario.
 */
export function EvaluationCycles({ courseId, activities }: { courseId: string; activities: Activity[] }) {
  const { data, isPending, error } = useCycles(courseId);
  const save = useSaveCycles(courseId);
  const reduce = useReducedMotion();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [current, setCurrent] = useState<number | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  useEffect(() => { if (data && !draft) setDraft(fromServer(data)); }, [data, draft]);
  // Abre en la evaluación en curso (o la primera) la primera vez que llegan los datos.
  useEffect(() => { if (draft && current === null) setCurrent(draft.active ?? 1); }, [draft, current]);
  const original = useMemo(() => (data ? JSON.stringify(fromServer(data)) : ''), [data]);
  const dirty = draft !== null && JSON.stringify(draft) !== original;

  const deliverables = activities.filter((activity) => !activity.isCalculated);
  const calculated = activities.filter((activity) => activity.isCalculated);
  const byId = new Map(activities.map((activity) => [activity.id, activity]));

  if (isPending || !draft || !data || current === null) return error ? <EmptyState tone="danger" icon={<ExclamationTriangleIcon />} title="No pudimos cargar tus evaluaciones">{error.message}</EmptyState> : <Skeleton height={320} />;

  const meta = new Map(data.cycles.map((item) => [item.number, item]));
  const calendar = data.cycles.some((item) => item.examStart);
  const today = new Date().toLocaleDateString('en-CA');
  const statusOf = (number: number): 'closed' | 'current' | 'upcoming' | null => {
    const m = meta.get(number);
    if (!m?.examEnd) return null;
    if (draft.active === number) return 'current';
    return today > m.examEnd ? 'closed' : 'upcoming';
  };

  const cycle = draft.cycles[current]!;
  const currentMeta = meta.get(current);
  const currentStatus = statusOf(current);
  // Avance estimado de esta evaluación con lo ya calificado (la nota oficial la publica el docente en el portal).
  const inCycle = cycle.items.map((item) => byId.get(item.activityId)).filter((activity): activity is Activity => Boolean(activity));
  const graded = inCycle.filter((activity) => activity.score !== null && activity.pointsPossible);
  const earnedTotal = graded.reduce((sum, activity) => sum + Number(activity.score), 0);
  const possibleTotal = graded.reduce((sum, activity) => sum + Number(activity.pointsPossible), 0);
  const weightOfCycle = toNumber(cycle.weightPercent) ?? 20;

  const assignedElsewhere = new Map<string, number>();
  for (const [number, value] of Object.entries(draft.cycles)) for (const item of value.items) assignedElsewhere.set(item.activityId, Number(number));
  const available = deliverables.filter((activity) => !assignedElsewhere.has(activity.id));
  const totalWeight = Object.values(draft.cycles).reduce((sum, value) => sum + (toNumber(value.weightPercent) ?? 0), 0);

  const updateCycle = (change: Partial<CycleDraft>) =>
    setDraft({ ...draft, cycles: { ...draft.cycles, [current]: { ...cycle, ...change } } });

  function submit() {
    if (!draft) return;
    save.mutate({
      activeNumber: draft.active,
      cycles: Object.entries(draft.cycles).map(([number, value]) => ({
        number: Number(number), label: null, weightPercent: toNumber(value.weightPercent),
        items: value.items.map((item) => ({ activityId: item.activityId, weightWithinCycle: toNumber(item.weight) })),
      })),
    }, {
      onSuccess: (result) => { setDraft(fromServer(result)); setSavedAt(Date.now()); },
    });
  }

  const saveError = save.error instanceof ApiError ? save.error.message : save.error ? 'No se pudo guardar.' : null;

  return (
    <div>
      <p className={styles.intro}>
        {calendar
          ? <>Tus actividades ya están repartidas en las <strong>5 evaluaciones</strong> del ciclo según su fecha de entrega y el calendario oficial de UTEC. Si tu docente las agrupa distinto, muévelas y guarda: <strong>tu configuración manda sobre el calendario</strong>. La nota de Blackboard no se modifica.</>
          : <>Organiza tus actividades en las cinco evaluaciones de la materia. Este ciclo aún no tiene calendario cargado, así que la configuración es tuya. La nota de Blackboard no se modifica.</>}
      </p>

      <div className={styles.tabs} role="tablist" aria-label="Evaluación">
        {Array.from({ length: CYCLE_COUNT }, (_, index) => {
          const number = index + 1; const m = meta.get(number); const status = statusOf(number);
          return (
            <button key={number} type="button" role="tab" aria-selected={current === number} className={cx(styles.tab, current === number && styles.tabOn)} data-status={status ?? 'none'} onClick={() => setCurrent(number)}>
              <span className={styles.tabTop}><span className={styles.tabName}>Eval. {number}</span><span className={styles.tabCount}>{draft.cycles[number]!.items.length}</span></span>
              <span className={styles.tabDate}>{m?.examStart && m.examEnd ? dayRange(m.examStart, m.examEnd) : 'sin fecha'}</span>
              {status && <span className={styles.tabState}>{status === 'closed' ? 'Cerrada' : status === 'current' ? 'En curso' : 'Próxima'}</span>}
            </button>
          );
        })}
      </div>
      {!calendar && totalWeight > 0 && <p className={styles.weightNote} data-over={totalWeight > 100}>Pesos de evaluaciones: {formatScore(totalWeight)} % {totalWeight > 100 ? '(supera 100 %)' : ''}</p>}

      <AnimatePresence mode="wait">
        <motion.div key={current} initial={reduce ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
          <div className={styles.cycleTitle}>
            <h3>Evaluación {current}</h3>
            {currentStatus === 'current' && <Badge tone="accent">En curso</Badge>}
            {currentStatus === 'closed' && <Badge tone="success">Examen realizado</Badge>}
            {calendar && <span className={styles.chip}>{weightOfCycle} % de la materia</span>}
          </div>
          {currentMeta?.examStart && currentMeta.examEnd && (
            <p className={styles.when}>
              <CalendarDaysIcon width={18} height={18} aria-hidden="true" />
              <span>Examen <strong>{dayRange(currentMeta.examStart, currentMeta.examEnd)}</strong></span>
              {currentMeta.deferredStart && currentMeta.deferredEnd && <span>Diferido <strong>{dayRange(currentMeta.deferredStart, currentMeta.deferredEnd)}</strong></span>}
              {currentMeta.gradesCorrectionDeadline && <span>Notas se corrigen hasta el <strong>{dayRange(currentMeta.gradesCorrectionDeadline, currentMeta.gradesCorrectionDeadline)}</strong></span>}
            </p>
          )}
          {graded.length > 0 && possibleTotal > 0 && (
            <p className={styles.summary}>
              Llevas <strong className="tabular">{((earnedTotal / possibleTotal) * (weightOfCycle / 10)).toFixed(2)}</strong> de {(weightOfCycle / 10).toFixed(1)} en esta evaluación
              <span> · {graded.length} de {inCycle.length} actividades calificadas (estimado con Blackboard)</span>
            </p>
          )}
          {!calendar && (
            <div className={styles.fields}>
              <label className={styles.field}>
                Peso de la evaluación en la materia (%)
                <input className={styles.number} type="number" inputMode="decimal" min={0} max={100} step="0.5" placeholder="Opcional"
                  value={cycle.weightPercent} onChange={(event) => updateCycle({ weightPercent: event.target.value })} />
              </label>
              <label className={styles.check}>
                <input type="checkbox" checked={draft.active === current}
                  onChange={(event) => setDraft({ ...draft, active: event.target.checked ? current : null })} />
                Es la evaluación que estoy cursando ahora
              </label>
            </div>
          )}

          <div className={styles.columns}>
            <section aria-labelledby="assigned-title">
              <h4 id="assigned-title" className={styles.subhead}>Actividades de la evaluación {current} ({cycle.items.length})</h4>
              {cycle.items.length === 0 ? <p className={styles.empty}>No hay actividades en esta evaluación.</p> : (
                <ul className={styles.rows}>
                  {cycle.items.map((item, index) => {
                    const activity = byId.get(item.activityId);
                    return (
                      <li key={item.activityId} className={styles.row}>
                        <div>
                          <p className={styles.rowTitle}>{activity ? activity.effectiveName ?? activity.name : 'Actividad no disponible'}</p>
                          <p className={styles.rowMeta}>
                            {activity && `${categoryLabel(activity.categoryKey, activity.categoryTitle) ?? activityKind(activity.kind)} · ${activity.dueAt ? formatShortDate(activity.dueAt) : 'sin fecha'} · nota ${formatScore(activity.score)}${activity.pointsPossible ? ` / ${formatScore(activity.pointsPossible)}` : ''}`}
                          </p>
                        </div>
                        <div className={styles.rowActions}>
                          <label>
                            <span className="visually-hidden">Peso dentro de la evaluación (%)</span>
                            <input className={cx(styles.number, styles.small)} type="number" inputMode="decimal" min={0} max={100} step="0.5" placeholder="Peso"
                              value={item.weight} onChange={(event) => updateCycle({ items: cycle.items.map((value, i) => (i === index ? { ...value, weight: event.target.value } : value)) })} />
                          </label>
                          <button type="button" className={styles.iconButton} aria-label={`Quitar ${activity?.name ?? 'actividad'} de la evaluación`}
                            onClick={() => updateCycle({ items: cycle.items.filter((_, i) => i !== index) })}>
                            <MinusIcon aria-hidden="true" />
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            <section aria-labelledby="available-title">
              <h4 id="available-title" className={styles.subhead}>Sin evaluación asignada ({available.length})</h4>
              {available.length === 0 ? <p className={styles.empty}>Todas las actividades están en una evaluación.</p> : (
                <ul className={styles.rows}>
                  {available.map((activity) => (
                    <li key={activity.id} className={styles.row}>
                      <div>
                        <p className={styles.rowTitle}>{activity.effectiveName ?? activity.name}</p>
                        <p className={styles.rowMeta}>{categoryLabel(activity.categoryKey, activity.categoryTitle) ?? activityKind(activity.kind)} · {activity.dueAt ? formatShortDate(activity.dueAt) : 'sin fecha'}</p>
                      </div>
                      <button type="button" className={styles.iconButton} aria-label={`Agregar ${activity.name} a la evaluación ${current}`}
                        onClick={() => updateCycle({ items: [...cycle.items, { activityId: activity.id, weight: '' }] })}>
                        <PlusIcon aria-hidden="true" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {calculated.length > 0 && (
                <p className={styles.rowMeta} style={{ marginTop: 12 }}>
                  Referencia: tu docente configuró {calculated.length} {calculated.length === 1 ? 'columna calculada' : 'columnas calculadas'} en Blackboard
                  ({calculated.map((activity) => activity.name).join(', ')}). Puede orientarte, pero no se usa para asignar evaluaciones.
                </p>
              )}
            </section>
          </div>
        </motion.div>
      </AnimatePresence>

      <div className={cx(styles.footer, dirty && styles.footerSticky)} role="status" aria-live="polite">
        <span className={styles.footerText}>
          {saveError ? <span className={styles.error}>{saveError}</span>
            : dirty ? 'Tienes cambios sin guardar.'
              : savedAt ? <span className={styles.ok}><CheckCircleIcon width={16} height={16} style={{ verticalAlign: '-3px' }} aria-hidden="true" /> Configuración guardada.</span>
                : calendar ? 'Reparto automático según el calendario. Si guardas cambios, el tuyo lo reemplaza.' : 'Tu configuración se guarda en tu cuenta.'}
        </span>
        <div style={{ display: 'flex', gap: 8 }}>
          {dirty && <Button variant="ghost" onClick={() => data && setDraft(fromServer(data))}>Descartar</Button>}
          <Button onClick={submit} loading={save.isPending} disabled={!dirty || totalWeight > 100}>Guardar cambios</Button>
        </div>
      </div>
    </div>
  );
}
