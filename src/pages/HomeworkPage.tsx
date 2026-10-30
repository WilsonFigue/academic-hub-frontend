import { ArrowLeft, BookCheck, CalendarClock, Download, ExternalLink, FileText, Loader2, TriangleAlert } from 'lucide-react';
import { motion } from 'motion/react';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { homeworkFileUrl, useActivity, useHomework } from '../api/hooks';
import type { HomeworkDeliverable } from '../api/types';
import { HOMEWORK_KIND } from '../components/Homework';
import { Skeleton } from '../components/ui';
import { courseIcon } from '../lib/courseIcon';
import { courseTitle, formatDate, formatDueRelative } from '../lib/format';
import { useReducedMotion } from '../lib/motion';
import { tintFor } from '../lib/tint';
import guide from './StudyGuidePage.module.css';
import styles from './HomeworkPage.module.css';

const ease = [0.22, 1, 0.36, 1] as const;
const formatBytes = (n: number) => (n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

function FileCard({ activityId, file, selected, onPreview }: { activityId: string; file: HomeworkDeliverable; selected: boolean; onPreview: () => void }) {
  const look = HOMEWORK_KIND[file.kind];
  const Icon = look.icon;
  const url = homeworkFileUrl(activityId, file.name);
  return (
    <li className={styles.file} data-selected={selected} style={{ ['--k' as string]: look.color }}>
      <span className={styles.fileIcon} aria-hidden="true"><Icon size={22} /></span>
      <span className={styles.fileText}>
        <b>{file.name}</b>
        <small>{look.label} · {formatBytes(file.bytes)}{file.kind === 'ggb' ? ' · ábrelo en geogebra.org/classic (Archivo → Abrir)' : ''}</small>
      </span>
      <span className={styles.fileActions}>
        {file.kind === 'pdf' && <button type="button" onClick={onPreview}><FileText size={15} aria-hidden="true" />{selected ? 'Viendo' : 'Ver aquí'}</button>}
        {file.kind === 'pdf' && <a href={url} target="_blank" rel="noopener noreferrer"><ExternalLink size={15} aria-hidden="true" />Pestaña nueva<span className="visually-hidden"> ({file.name})</span></a>}
        <a href={url} download={file.name}><Download size={15} aria-hidden="true" />Descargar<span className="visually-hidden"> {file.name}</span></a>
      </span>
    </li>
  );
}

/** Vista de la tarea que dejó lista la rutina: sus archivos, vista previa del PDF y lo que falta completar. */
export function HomeworkPage() {
  const { activityId = '' } = useParams();
  const navigate = useNavigate();
  const reduce = useReducedMotion();
  const activityQuery = useActivity(activityId);
  const homeworkQuery = useHomework(activityId);
  const activity = activityQuery.data?.activity;
  const run = homeworkQuery.data?.homework;
  const [chosen, setChosen] = useState<string | null>(null);
  const tint = tintFor(activity?.courseId ?? activityId);
  const Icon = courseIcon(activity?.courseName ?? '');
  const back = () => (window.history.length > 1 ? navigate(-1) : navigate('/activities', { replace: true }));

  if (activityQuery.isPending || homeworkQuery.isPending) return <div className={guide.page}><Skeleton height={200} radius={28} /><div style={{ height: 16 }} /><Skeleton height={320} radius={24} /></div>;

  if (!activity || !run || run.status !== 'ready') {
    const working = run && (run.status === 'requested' || run.status === 'generating');
    return (
      <div className={guide.page}>
        <button type="button" className={guide.back} onClick={back}><ArrowLeft size={16} aria-hidden="true" />Volver</button>
        <div className={guide.empty}>
          {working ? <Loader2 size={30} className={guide.spin} aria-hidden="true" /> : <TriangleAlert size={30} aria-hidden="true" />}
          <h1>{working ? 'Tu tarea todavía no está lista' : 'Esta actividad aún no tiene tarea lista'}</h1>
          <p>{working ? 'La rutina la está haciendo. Vuelve en un momento.' : 'La rutina la dejará aquí cuando la termine.'}</p>
          <Link to="/activities">Ir a Actividades</Link>
        </div>
      </div>
    );
  }

  const title = activity.effectiveName ?? activity.name;
  const pdfs = run.deliverables.filter((file) => file.kind === 'pdf');
  const preview = pdfs.find((file) => file.name === chosen) ?? pdfs[0] ?? null;
  const report = run.report;
  const missing = report?.pending ?? [];

  return (
    <div className={guide.page} style={{ ['--c' as string]: tint.fg, ['--cbg' as string]: tint.bg }}>
      <div className={guide.toolbar}>
        <button type="button" className={guide.back} onClick={back}><ArrowLeft size={16} aria-hidden="true" />Volver</button>
      </div>

      <motion.header className={guide.hero} initial={reduce ? false : { opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease }}>
        <Icon className={guide.mark} size={240} strokeWidth={1} aria-hidden="true" />
        <p className={guide.kicker}><BookCheck size={14} aria-hidden="true" />Tarea lista para enviar · {courseTitle(activity.courseName)}</p>
        <h1>{title}</h1>
        <div className={guide.chips}>
          {activity.dueAt && <span><CalendarClock size={14} aria-hidden="true" />Entrega {formatDate(activity.dueAt)} · {formatDueRelative(activity.dueAt)}</span>}
          {activity.pointsPossible && <span>{Number(activity.pointsPossible)} puntos</span>}
          <span><FileText size={14} aria-hidden="true" />{run.deliverables.length} {run.deliverables.length === 1 ? 'archivo' : 'archivos'}</span>
          <span>Hecha con IA{run.finishedAt ? ` · ${formatDate(run.finishedAt)}` : ''}</span>
        </div>
      </motion.header>

      <main className={styles.main}>
        <motion.section className={styles.card} initial={reduce ? false : { opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: 0.08, ease }} aria-labelledby="hw-files">
          <h2 id="hw-files">Archivos de la tarea</h2>
          <ul className={styles.files}>
            {run.deliverables.map((file) => <FileCard key={file.name} activityId={activityId} file={file} selected={preview?.name === file.name} onPreview={() => setChosen(file.name)} />)}
          </ul>
        </motion.section>

        {preview && (
          <motion.section className={styles.card} initial={reduce ? false : { opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: 0.14, ease }} aria-labelledby="hw-preview">
            <h2 id="hw-preview">Vista previa · {preview.name}</h2>
            <iframe className={styles.viewer} title={`Vista previa de ${preview.name}`} src={homeworkFileUrl(activityId, preview.name)} />
          </motion.section>
        )}

        {missing.length > 0 && (
          <section className={styles.card} data-tone="pending" aria-labelledby="hw-missing">
            <h2 id="hw-missing"><TriangleAlert size={18} aria-hidden="true" />Antes de entregarla</h2>
            <ul className={styles.list}>{missing.map((item) => <li key={item}>{item}</li>)}</ul>
            {report && report.placeholders.length > 0 && <p className={styles.hint}>Los archivos tienen {report.placeholders.length} marcadores «[COMPLETAR: …]» resaltados donde faltaba un dato que no se debía inventar.</p>}
          </section>
        )}

        {report && report.assumptions.length > 0 && (
          <details className={styles.card}>
            <summary className={styles.summary}>Supuestos que hizo la IA ({report.assumptions.length})</summary>
            <ul className={styles.list}>{report.assumptions.map((item) => <li key={item}>{item}</li>)}</ul>
          </details>
        )}

        <p className={guide.disclaimer}>Esta tarea la hizo una IA a partir de las instrucciones y el material de tu materia. Revísala completa y adáptala antes de entregarla: es un borrador, no una entrega.</p>
      </main>
    </div>
  );
}
