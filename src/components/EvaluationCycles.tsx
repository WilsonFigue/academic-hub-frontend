import { CheckCircleIcon, ExclamationTriangleIcon, MinusIcon, PlusIcon } from '@heroicons/react/24/outline';
import { AnimatePresence, motion } from 'motion/react';
import { useReducedMotion } from '../lib/motion';
import { useEffect, useMemo, useState } from 'react';
import { ApiError } from '../api/client';
import { useCycles, useSaveCycles } from '../api/hooks';
import type { Activity, EvaluationCycles as CyclesData } from '../api/types';
import { activityKind, categoryLabel, formatScore, formatShortDate } from '../lib/format';
import { Segmented } from './Filters';
import { Badge, Button, EmptyState, Skeleton } from './ui';
import styles from './EvaluationCycles.module.css';

const CYCLE_COUNT = 5;

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
 * Configuración personal de los ciclos evaluativos de una materia.
 * Blackboard no los expone: el estudiante los arma; nada se asigna automáticamente.
 */
export function EvaluationCycles({ courseId, activities }: { courseId: string; activities: Activity[] }) {
  const { data, isPending, error } = useCycles(courseId);
  const save = useSaveCycles(courseId);
  const reduce = useReducedMotion();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [current, setCurrent] = useState(1);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  useEffect(() => { if (data && !draft) setDraft(fromServer(data)); }, [data, draft]);
  const original = useMemo(() => (data ? JSON.stringify(fromServer(data)) : ''), [data]);
  const dirty = draft !== null && JSON.stringify(draft) !== original;

  const deliverables = activities.filter((activity) => !activity.isCalculated);
  const calculated = activities.filter((activity) => activity.isCalculated);
  const byId = new Map(activities.map((activity) => [activity.id, activity]));

  if (isPending || !draft) return error ? <EmptyState tone="danger" icon={<ExclamationTriangleIcon />} title="No pudimos cargar tus ciclos">{error.message}</EmptyState> : <Skeleton height={320} />;

  const cycle = draft.cycles[current]!;
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
        Organiza tus actividades en los cinco ciclos evaluativos de la materia. Blackboard no informa estos ciclos, así que la configuración es tuya:
        nada se asigna automáticamente. Los pesos son opcionales y separados: <strong>peso del ciclo en la materia</strong> y <strong>peso de la actividad dentro del ciclo</strong>.
        La nota de Blackboard no se modifica y Academic Hub no calcula promedios oficiales.
      </p>

      <div className={styles.head}>
        <Segmented<string> label="Ciclo evaluativo" value={String(current)} onChange={(value) => setCurrent(Number(value))}
          options={Array.from({ length: CYCLE_COUNT }, (_, index) => ({
            value: String(index + 1), label: `Ciclo ${index + 1}`, count: draft.cycles[index + 1]!.items.length,
          }))} />
        {totalWeight > 0 && <span className="tabular" style={{ fontSize: 'var(--text-sm)', color: totalWeight > 100 ? 'var(--color-danger)' : 'var(--color-ink-2)' }}>
          Pesos de ciclos: {formatScore(totalWeight)} % {totalWeight > 100 ? '(supera 100 %)' : ''}
        </span>}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={current} initial={reduce ? false : { opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
          <div className={styles.cycleTitle}>
            <h3>Ciclo {current}</h3>
            {draft.active === current && <Badge tone="accent">Ciclo activo</Badge>}
          </div>
          <div className={styles.fields}>
            <label className={styles.field}>
              Peso del ciclo en la materia (%)
              <input className={styles.number} type="number" inputMode="decimal" min={0} max={100} step="0.5" placeholder="Opcional"
                value={cycle.weightPercent} onChange={(event) => updateCycle({ weightPercent: event.target.value })} />
              <small>Solo si lo conoces (p. ej. por el programa de la materia).</small>
            </label>
            <label className={styles.check}>
              <input type="checkbox" checked={draft.active === current}
                onChange={(event) => setDraft({ ...draft, active: event.target.checked ? current : null })} />
              Es el ciclo que estoy cursando ahora
            </label>
          </div>

          <div className={styles.columns}>
            <section aria-labelledby="assigned-title">
              <h4 id="assigned-title" className={styles.subhead}>Actividades del ciclo {current} ({cycle.items.length})</h4>
              {cycle.items.length === 0 ? <p className={styles.empty}>Aún no asignaste actividades a este ciclo.</p> : (
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
                            <span className="visually-hidden">Peso dentro del ciclo (%)</span>
                            <input className={`${styles.number} ${styles.small}`} type="number" inputMode="decimal" min={0} max={100} step="0.5" placeholder="Peso"
                              value={item.weight} onChange={(event) => updateCycle({ items: cycle.items.map((value, i) => (i === index ? { ...value, weight: event.target.value } : value)) })} />
                          </label>
                          <button type="button" className={styles.iconButton} aria-label={`Quitar ${activity?.name ?? 'actividad'} del ciclo`}
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
              <h4 id="available-title" className={styles.subhead}>Sin ciclo asignado ({available.length})</h4>
              {available.length === 0 ? <p className={styles.empty}>Todas las actividades tienen ciclo.</p> : (
                <ul className={styles.rows}>
                  {available.map((activity) => (
                    <li key={activity.id} className={styles.row}>
                      <div>
                        <p className={styles.rowTitle}>{activity.effectiveName ?? activity.name}</p>
                        <p className={styles.rowMeta}>{categoryLabel(activity.categoryKey, activity.categoryTitle) ?? activityKind(activity.kind)} · {activity.dueAt ? formatShortDate(activity.dueAt) : 'sin fecha'}</p>
                      </div>
                      <button type="button" className={styles.iconButton} aria-label={`Agregar ${activity.name} al ciclo ${current}`}
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
                  ({calculated.map((activity) => activity.name).join(', ')}). Puede orientarte, pero no se usa para asignar ciclos.
                </p>
              )}
            </section>
          </div>
        </motion.div>
      </AnimatePresence>

      <div className={`${styles.footer} ${dirty ? styles.footerSticky : ''}`} role="status" aria-live="polite">
        <span className={styles.footerText}>
          {saveError ? <span className={styles.error}>{saveError}</span>
            : dirty ? 'Tienes cambios sin guardar.'
              : savedAt ? <span className={styles.ok}><CheckCircleIcon width={16} height={16} style={{ verticalAlign: '-3px' }} aria-hidden="true" /> Configuración guardada.</span>
                : 'Tu configuración se guarda en tu cuenta.'}
        </span>
        <div style={{ display: 'flex', gap: 8 }}>
          {dirty && <Button variant="ghost" onClick={() => data && setDraft(fromServer(data))}>Descartar</Button>}
          <Button onClick={submit} loading={save.isPending} disabled={!dirty || totalWeight > 100}>Guardar ciclos</Button>
        </div>
      </div>
    </div>
  );
}
