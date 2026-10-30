import { ArrowLeft, CalendarClock, Check, Download, FileText, Loader2, Shapes, Sparkles, TriangleAlert } from 'lucide-react';
import { motion } from 'motion/react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { guideDocxUrl, guidePdfUrl, useActivity, useStudyGuide } from '../api/hooks';
import type { StudyGuide } from '../api/types';
import { GeoGebraPanel } from '../components/GeoGebraPanel';
import { GuidePdfViewer } from '../components/GuidePdfViewer';
import { Skeleton } from '../components/ui';
import { courseIcon } from '../lib/courseIcon';
import { courseTitle, formatDate, formatDueRelative } from '../lib/format';
import { useReducedMotion } from '../lib/motion';
import { tintFor } from '../lib/tint';
import styles from './StudyGuidePage.module.css';

const ease = [0.22, 1, 0.36, 1] as const;
const slug = (value: string, index: number) => `s${index}-${value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`;
const isChecklist = (heading: string) => /antes de entregar|lista de verificaci/i.test(heading);
const isMissing = (heading: string) => /no cubre|no cubren/i.test(heading);
const stepNumber = /^\s*\d+[.)]\s*/;

function readChecked(key: string): Record<string, boolean> {
  try { return JSON.parse(window.localStorage.getItem(key) ?? '{}') as Record<string, boolean>; } catch { return {}; }
}

/** Lista de verificación: se puede ir marcando y se recuerda en este navegador. */
function Checklist({ guideId, items }: { guideId: string; items: string[] }) {
  const key = `ah-guide-check-${guideId}`;
  const [checked, setChecked] = useState<Record<string, boolean>>(() => readChecked(key));
  const toggle = (item: string) => {
    const next = { ...checked, [item]: !checked[item] };
    setChecked(next);
    try { window.localStorage.setItem(key, JSON.stringify(next)); } catch { /* sin almacenamiento */ }
  };
  const done = items.filter((item) => checked[item]).length;
  return (
    <>
      <p className={styles.progress}><b className="tabular">{done}</b> de {items.length} listos<span aria-hidden="true"><i style={{ width: `${(done / items.length) * 100}%` }} /></span></p>
      <ul className={styles.checks}>
        {items.map((item) => (
          <li key={item}>
            <button type="button" role="checkbox" aria-checked={Boolean(checked[item])} data-on={Boolean(checked[item])} onClick={() => toggle(item)}>
              <span className={styles.box}><Check size={14} strokeWidth={3.4} aria-hidden="true" /></span>
              <span>{item}</span>
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}

function Section({ guide, heading, body, bullets, index, reduce }: { guide: StudyGuide; heading: string; body: string; bullets: string[]; index: number; reduce: boolean }) {
  const numbered = bullets.length > 0 && bullets.every((bullet) => stepNumber.test(bullet));
  return (
    <motion.section id={slug(heading, index)} className={styles.section} data-missing={isMissing(heading)} initial={reduce ? false : { opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }} transition={{ duration: 0.45, ease }}>
      <header><span className={styles.num} aria-hidden="true">{isMissing(heading) ? <TriangleAlert size={16} /> : index + 1}</span><h2>{heading}</h2></header>
      {body && <p style={{ whiteSpace: 'pre-line' }}>{body}</p>}
      {bullets.length > 0 && (isChecklist(heading) ? <Checklist guideId={guide.id} items={bullets} />
        : numbered ? <ol className={styles.steps}>{bullets.map((bullet) => <li key={bullet}><span>{bullet.replace(stepNumber, '')}</span></li>)}</ol>
          : <ul className={styles.bullets}>{bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}</ul>)}
    </motion.section>
  );
}

/** Vista dedicada de la guía de estudio de una actividad. */
export function StudyGuidePage() {
  const { activityId = '' } = useParams();
  const navigate = useNavigate();
  const reduce = useReducedMotion();
  const activityQuery = useActivity(activityId);
  const guideQuery = useStudyGuide(activityId);
  const activity = activityQuery.data?.activity;
  const guide = guideQuery.data?.guide ?? null;
  const content = guide?.status === 'ready' ? guide.content : null;
  const tint = tintFor(activity?.courseId);
  const Icon = courseIcon(activity ? courseTitle(activity.courseName) : '');
  const sections = useMemo(() => (content?.sections ?? []).map((section, index) => ({ ...section, id: slug(section.heading, index) })), [content]);
  const [current, setCurrent] = useState<string | null>(null);
  const [pdfOpen, setPdfOpen] = useState(false);

  // Resalta en el índice la sección que se está leyendo.
  useEffect(() => {
    if (sections.length === 0) return;
    const seen = new Map<string, number>();
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) seen.set(entry.target.id, entry.isIntersecting ? entry.intersectionRatio : 0);
      const best = [...seen].sort((a, b) => b[1] - a[1])[0];
      if (best && best[1] > 0) setCurrent(best[0]);
    }, { rootMargin: '-20% 0px -55% 0px', threshold: [0, 0.25, 0.6, 1] });
    for (const section of sections) { const node = document.getElementById(section.id); if (node) observer.observe(node); }
    return () => observer.disconnect();
  }, [sections]);

  const wantsGeoGebra = Boolean(guide?.tools.includes('geogebra'));
  const back = () => (window.history.length > 1 ? navigate(-1) : navigate('/activities', { replace: true }));
  const goTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });

  if (activityQuery.isPending || guideQuery.isPending) return <div className={styles.page}><Skeleton height={200} radius={28} /><div style={{ height: 16 }} /><Skeleton height={320} radius={24} /></div>;

  if (!activity || !guide || guide.status !== 'ready' || !content) {
    return (
      <div className={styles.page}>
        <button type="button" className={styles.back} onClick={back}><ArrowLeft size={16} aria-hidden="true" />Volver</button>
        <div className={styles.empty}>
          {guide && (guide.status === 'requested' || guide.status === 'generating') ? <Loader2 size={30} className={styles.spin} aria-hidden="true" /> : <Sparkles size={30} aria-hidden="true" />}
          <h1>{guide && (guide.status === 'requested' || guide.status === 'generating') ? 'Tu guía todavía no está lista' : 'Esta actividad aún no tiene guía'}</h1>
          <p>{guide && (guide.status === 'requested' || guide.status === 'generating') ? 'Se está preparando. Vuelve en un momento.' : 'Pídela desde el detalle de la actividad.'}</p>
          <Link to="/activities">Ir a Actividades</Link>
        </div>
      </div>
    );
  }

  const title = activity.effectiveName ?? activity.name;
  return (
    <div className={styles.page} style={{ ['--c' as string]: tint.fg, ['--cbg' as string]: tint.bg }}>
      <div className={styles.toolbar}>
        <button type="button" className={styles.back} onClick={back}><ArrowLeft size={16} aria-hidden="true" />Volver</button>
        <div className={styles.pdfActions}>
          <button type="button" className={styles.print} onClick={() => setPdfOpen(true)}><FileText size={16} aria-hidden="true" />Ver PDF</button>
          <a className={styles.print} href={guidePdfUrl(activityId, true)} download><Download size={16} aria-hidden="true" />Descargar PDF</a>
          <a className={styles.print} href={guideDocxUrl(activityId)} download><Download size={16} aria-hidden="true" />Descargar Word</a>
        </div>
      </div>

      <motion.header className={styles.hero} initial={reduce ? false : { opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease }}>
        <Icon className={styles.mark} size={240} strokeWidth={1} aria-hidden="true" />
        <p className={styles.kicker}><Sparkles size={14} aria-hidden="true" />Guía de estudio · {courseTitle(activity.courseName)}</p>
        <h1>{title}</h1>
        <div className={styles.chips}>
          {activity.dueAt && <span><CalendarClock size={14} aria-hidden="true" />Entrega {formatDate(activity.dueAt)} · {formatDueRelative(activity.dueAt)}</span>}
          {activity.pointsPossible && <span>{Number(activity.pointsPossible)} puntos</span>}
          <span><FileText size={14} aria-hidden="true" />{content.sources.length} {content.sources.length === 1 ? 'fuente' : 'fuentes'}</span>
          <span>Generada con IA{guide.finishedAt ? ` · ${formatDate(guide.finishedAt)}` : ''}</span>
        </div>
      </motion.header>

      <div className={styles.layout}>
        <nav className={styles.toc} aria-label="Contenido de la guía">
          <p>En esta guía</p>
          <ol>
            {sections.map((section, index) => (
              <li key={section.id}>
                <a href={`#${section.id}`} aria-current={current === section.id ? 'true' : undefined} onClick={(event) => { event.preventDefault(); goTo(section.id); }}>
                  <span>{index + 1}</span>{section.heading}
                </a>
              </li>
            ))}
            {wantsGeoGebra && <li><a href="#geogebra" onClick={(event) => { event.preventDefault(); goTo('geogebra'); }}><span><Shapes size={12} aria-hidden="true" /></span>GeoGebra</a></li>}
            {content.sources.length > 0 && <li><a href="#fuentes" onClick={(event) => { event.preventDefault(); goTo('fuentes'); }}><span><FileText size={12} aria-hidden="true" /></span>Fuentes</a></li>}
          </ol>
        </nav>

        <main className={styles.main}>
          <motion.p className={styles.summary} initial={reduce ? false : { opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: 0.1, ease }}>{content.summary}</motion.p>
          {content.sections.map((section, index) => (
            <Section key={section.heading} guide={guide} heading={section.heading} body={section.body} bullets={section.bullets ?? []} index={index} reduce={reduce} />
          ))}
          {wantsGeoGebra && (
            <motion.section id="geogebra" className={styles.section} initial={reduce ? false : { opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.45, ease }}>
              <header><span className={styles.num} aria-hidden="true"><Shapes size={16} /></span><h2>Compruébalo en GeoGebra</h2></header>
              <p>Esta actividad pide usar GeoGebra. Ábrelo aquí mismo para graficar y comprobar tu trabajo.</p>
              <GeoGebraPanel />
            </motion.section>
          )}
          {content.sources.length > 0 && (
            <motion.section id="fuentes" className={styles.section} initial={reduce ? false : { opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.45, ease }}>
              <header><span className={styles.num} aria-hidden="true"><FileText size={15} /></span><h2>Fuentes</h2></header>
              <ul className={styles.sources}>
                {content.sources.map((source) => <li key={source.file}><FileText size={16} aria-hidden="true" /><span><b>{source.file}</b>{source.note && <small>{source.note}</small>}</span></li>)}
              </ul>
            </motion.section>
          )}
          <p className={styles.disclaimer}>Esta guía la generó una IA a partir del material de tu materia. Revísala con tus apuntes y las instrucciones de tu docente: ayuda a entender la actividad, no la reemplaza.</p>
        </main>
      </div>
      <GuidePdfViewer open={pdfOpen} activityId={activityId} title={title} onClose={() => setPdfOpen(false)} />
    </div>
  );
}
