import {
  AlertTriangle, AppWindow, BookCheck, BookOpenCheck, Check, CircleCheck, Clock, Download, ExternalLink, File, FileArchive, FileImage, FileSpreadsheet, FileText, FileVideo, Link2, Loader2, Maximize2, Minimize2, Presentation, Search, Send, Undo2, X,
  type LucideIcon,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ApiError } from '../api/client';
import { fileUrl, renderUrl, useContentPreview, useSetReviewed } from '../api/hooks';
import type { ContentPreview, Preview, ReviewMark } from '../api/types';
import { formatDateTime } from '../lib/format';
import { useReducedMotion } from '../lib/motion';
import styles from './FileViewer.module.css';

const ease = [0.22, 1, 0.36, 1] as const;
const cx = (...names: Array<string | false | null | undefined>) => names.filter(Boolean).join(' ');

/** Lo mínimo para abrir un recurso: una fila del contenido de la materia o una guía de una actividad. */
export interface ViewerTarget {
  courseId: string;
  id: string;
  title: string;
  handler: string;
  file?: { name: string; mimeType: string; size: number } | null;
  externalUrl?: string | null;
  /** Enlace a la materia en Blackboard, para "Abrir en Blackboard". */
  lmsUrl?: string | null;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(bytes < 10 * 1024 ** 2 ? 1 : 0)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
}

export function fileLook(mime: string | null | undefined, name: string | null | undefined): { tag: string; icon: LucideIcon; color: string } {
  const lower = (name ?? '').toLowerCase();
  if (mime === 'application/pdf' || lower.endsWith('.pdf')) return { tag: 'PDF', icon: FileText, color: '#e5392f' };
  if (mime?.includes('presentationml') || /\.pptx?$/.test(lower)) return { tag: 'PPT', icon: Presentation, color: '#ea580c' };
  if (mime?.includes('wordprocessingml') || mime === 'application/msword' || /\.docx?$/.test(lower)) return { tag: 'DOC', icon: FileText, color: '#2f7cf6' };
  if (mime?.includes('spreadsheetml') || /\.(xlsx?|csv)$/.test(lower)) return { tag: 'XLS', icon: FileSpreadsheet, color: '#0f9f6e' };
  if (mime?.startsWith('video/')) return { tag: 'VIDEO', icon: FileVideo, color: '#7c5ce6' };
  if (mime?.startsWith('image/')) return { tag: 'IMG', icon: FileImage, color: '#db2777' };
  if (/\.(zip|rar|7z)$/.test(lower)) return { tag: 'ZIP', icon: FileArchive, color: '#a16207' };
  return { tag: 'ARCHIVO', icon: File, color: 'var(--sky)' };
}

/** Id del video si el enlace es de YouTube. */
function youtubeId(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (u.hostname === 'youtu.be') return u.pathname.slice(1) || null;
    if (u.hostname.endsWith('youtube.com')) return u.searchParams.get('v') ?? /^\/(?:embed|shorts)\/([\w-]+)/.exec(u.pathname)?.[1] ?? null;
  } catch { /* enlace no válido */ }
  return null;
}

const REVIEW_COPY: Record<'none' | ReviewMark['state'], { label: string; hint: string }> = {
  none: { label: 'Marcar como leído', hint: 'Cuando lo leas, márcalo: se envía a UTEC en ese momento.' },
  pending: { label: 'Marcado · aún no llegó a UTEC', hint: 'No pudimos enviarlo ahora; se reintenta solo en la próxima actualización de datos. UTEC lo registrará con la hora del envío.' },
  sent: { label: 'Enviado a UTEC', hint: 'Ya quedó registrado en Blackboard. Para quitarlo, hazlo en Blackboard.' },
  failed: { label: 'No se pudo enviar · reintentar', hint: 'Blackboard rechazó la marca tres veces. Puedes intentarlo de nuevo.' },
};

function problemText(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.code === 'files_unavailable' || error.code === 'no_stored_credentials') return 'Para abrir este archivo por primera vez hace falta tener tus credenciales de Blackboard recordadas. Una vez abierto, queda guardado y se ve al instante.';
    if (error.code === 'mfa_required') return 'UTEC pidió un código de verificación y no podemos entrar sin tu ayuda. Abre el archivo desde Blackboard.';
    if (error.code === 'blackboard_login_failed') return 'No pudimos entrar a Blackboard para traer el archivo. Inténtalo de nuevo en un momento.';
    if (error.code === 'file_too_large') return 'El archivo es demasiado grande para verlo aquí. Ábrelo en Blackboard.';
    return error.message;
  }
  return 'No pudimos abrir el archivo.';
}

function Loading({ text }: { text: string }) {
  return (
    <div className={styles.loading} role="status">
      <span className={styles.spinner}><Loader2 size={30} aria-hidden="true" /></span>
      <strong>{text}</strong>
      <p>La primera vez traemos el archivo desde Blackboard (unos segundos); después queda guardado y se abre al instante.</p>
    </div>
  );
}

function Notice({ icon: Icon = AlertTriangle, title, children }: { icon?: LucideIcon; title: string; children?: React.ReactNode }) {
  return <div className={styles.notice}><span><Icon size={26} aria-hidden="true" /></span><strong>{title}</strong>{children && <p>{children}</p>}</div>;
}

/** Texto plano con búsqueda: resalta cada coincidencia y cuenta cuántas hay. */
function TextView({ text }: { text: string }) {
  const [query, setQuery] = useState('');
  const ref = useRef<HTMLPreElement>(null);
  const needle = query.trim();
  const parts = useMemo(() => {
    if (!needle) return [text];
    const lower = text.toLowerCase();
    const n = needle.toLowerCase();
    const out: string[] = [];
    let from = 0;
    for (let at = lower.indexOf(n); at !== -1 && out.length < 800; at = lower.indexOf(n, from)) {
      out.push(text.slice(from, at), text.slice(at, at + n.length));
      from = at + n.length;
    }
    out.push(text.slice(from));
    return out;
  }, [text, needle]);
  const matches = needle ? Math.floor(parts.length / 2) : 0;
  useEffect(() => { ref.current?.querySelector('mark')?.scrollIntoView({ block: 'center', behavior: 'smooth' }); }, [needle]);
  return (
    <div className={styles.textView}>
      <label className={styles.find}>
        <Search size={16} aria-hidden="true" /><span className="visually-hidden">Buscar en el texto</span>
        <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar en el texto" autoComplete="off" spellCheck={false} />
        {needle && <b className="tabular">{matches === 0 ? 'Sin resultados' : `${matches} ${matches === 1 ? 'resultado' : 'resultados'}`}</b>}
      </label>
      <pre ref={ref}>{parts.map((part, i) => (i % 2 === 1 ? <mark key={i}>{part}</mark> : part))}</pre>
    </div>
  );
}

function SlidesView({ slides }: { slides: Extract<Preview, { kind: 'pptx' }>['slides'] }) {
  return (
    <ol className={styles.slides}>
      {slides.map((slide, i) => (
        <motion.li key={slide.n} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: Math.min(i, 8) * 0.04, ease }}>
          <span className={styles.slideN}>{slide.n}</span>
          <div><h3>{slide.title}</h3>{slide.lines.length > 0 && <ul>{slide.lines.map((line, j) => <li key={j}>{line}</li>)}</ul>}</div>
        </motion.li>
      ))}
    </ol>
  );
}

function SheetsView({ sheets }: { sheets: Extract<Preview, { kind: 'xlsx' }>['sheets'] }) {
  const [active, setActive] = useState(0);
  const sheet = sheets[Math.min(active, sheets.length - 1)]!;
  return (
    <div className={styles.sheets}>
      {sheets.length > 1 && <div className={styles.sheetTabs} role="tablist">{sheets.map((s, i) => <button key={s.name} type="button" role="tab" aria-selected={i === active} onClick={() => setActive(i)}>{s.name}</button>)}</div>}
      <div className={styles.tableWrap}>
        <table>
          <tbody>{sheet.rows.map((row, r) => <tr key={r}>{row.map((cell, c) => (r === 0 ? <th key={c}>{cell}</th> : <td key={c}>{cell}</td>))}</tr>)}</tbody>
        </table>
      </div>
      {sheet.truncated && <p className={styles.note}>Se muestran las primeras filas de la hoja. Descarga el archivo para verla completa.</p>}
    </div>
  );
}

/** Visor de recursos de la materia: PDF, Word, PowerPoint, Excel, imágenes, video, documentos de Blackboard y enlaces (YouTube se reproduce aquí). */
const EXPANDED_KEY = 'ah-viewer-expanded';
function readExpanded(): boolean {
  try { return window.localStorage.getItem(EXPANDED_KEY) === '1'; } catch { return false; }
}

export function FileViewer({ target, onClose }: { target: ViewerTarget | null; onClose: () => void }) {
  const reduce = useReducedMotion();
  // Pantalla completa dentro de la app: se recuerda para la próxima vez (comodidad por navegador).
  const [expanded, setExpanded] = useState(readExpanded);
  const toggleExpanded = () => setExpanded((value) => {
    const next = !value;
    try { window.localStorage.setItem(EXPANDED_KEY, next ? '1' : '0'); } catch { /* sin almacenamiento */ }
    return next;
  });
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!target) return;
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') { event.stopPropagation(); onClose(); } };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [target, onClose]);

  return (
    <AnimatePresence>
      {target && (
        <motion.div className={cx(styles.overlay, expanded && styles.overlayExpanded)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.15 } }} onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
          <motion.div className={cx(styles.panel, expanded && styles.panelExpanded)} role="dialog" aria-modal="true" aria-labelledby="viewer-title"
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 30, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={reduce ? { opacity: 0 } : { opacity: 0, y: 18, scale: 0.98, transition: { duration: 0.16 } }}
            transition={{ type: 'spring', stiffness: 380, damping: 34 }}>
            <ViewerBody key={target.id} target={target} onClose={onClose} closeRef={closeRef} expanded={expanded} onToggleExpanded={toggleExpanded} />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Segunda vista: el archivo en una página propia que ocupa toda la pantalla (se abre en una pestaña nueva). */
export function FileViewerPage({ target, onClose }: { target: ViewerTarget; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className={styles.pageRoot}>
      <div className={cx(styles.panel, styles.panelPage)} role="main" aria-labelledby="viewer-title">
        <ViewerBody target={target} onClose={onClose} closeRef={closeRef} page />
      </div>
    </div>
  );
}

function ViewerBody({ target, onClose, closeRef, expanded = false, onToggleExpanded, page = false }: {
  target: ViewerTarget; onClose: () => void; closeRef: React.RefObject<HTMLButtonElement | null>; expanded?: boolean; onToggleExpanded?: () => void; page?: boolean;
}) {
  const { courseId, id } = target;
  const mime = target.file?.mimeType ?? null;
  const name = target.file?.name ?? null;
  const look = fileLook(mime, name);
  const yt = youtubeId(target.externalUrl);
  const isPdf = mime === 'application/pdf';
  const office = Boolean(mime && /wordprocessingml|presentationml|spreadsheetml|msword|ms-powerpoint|ms-excel/.test(mime));
  const isSlides = Boolean(mime && /presentationml|ms-powerpoint/.test(mime));
  const isImage = Boolean(mime?.startsWith('image/'));
  const isVideo = Boolean(mime?.startsWith('video/'));
  const isAudio = Boolean(mime?.startsWith('audio/'));
  const needsPreview = !isImage && !isVideo && !isAudio;
  // El texto se pide siempre (también trae el estado de revisado); en PDF solo pesa al abrir la pestaña "Texto".
  const preview = useContentPreview(courseId, id, true);
  const [tab, setTab] = useState<'file' | 'text'>('file');
  const [frameReady, setFrameReady] = useState(false);
  const [mediaError, setMediaError] = useState(false);
  const [renderFailed, setRenderFailed] = useState(false);
  const data: ContentPreview | undefined = preview.data;
  const pv = data?.preview;
  // Word, PowerPoint y Excel se ven tal cual (convertidos a PDF con Office); el texto queda como segunda vista y como respaldo.
  const faithful = isPdf || (office && data?.render === 'office' && !renderFailed);
  const showTabs = isPdf || (office && data?.render === 'office');
  const Icon = target.file ? look.icon : yt ? FileVideo : target.handler === 'resource/x-bb-document' ? FileText : Link2;
  const color = target.file ? look.color : 'var(--mint)';
  const subtitle = [target.file ? look.tag : target.handler === 'resource/x-bb-document' ? 'Documento' : 'Enlace', name && name !== target.title ? name : null, target.file ? formatBytes(target.file.size) : null].filter(Boolean).join(' · ');

  return (
    <>
      <header className={styles.head} style={{ ['--k' as string]: color }}>
        <span className={styles.disc} aria-hidden="true"><Icon size={26} /></span>
        <div className={styles.headText}>
          <h2 id="viewer-title">{target.title}</h2>
          <p>{subtitle}</p>
        </div>
        <div className={styles.actions}>
          {!page && onToggleExpanded && (
            <button type="button" className={styles.iconAction} onClick={onToggleExpanded} aria-pressed={expanded} data-tip={expanded ? 'Reducir' : 'Pantalla completa'} aria-label={expanded ? 'Reducir la ventana' : 'Ver en pantalla completa'}>
              {expanded ? <Minimize2 size={18} aria-hidden="true" /> : <Maximize2 size={18} aria-hidden="true" />}
            </button>
          )}
          {!page && (
            <a className={styles.iconAction} href={`/courses/${courseId}/files/${id}`} target="_blank" rel="noopener noreferrer" data-tip="Abrir en una pestaña nueva" aria-label="Abrir en una pestaña nueva">
              <AppWindow size={18} aria-hidden="true" /><span className="visually-hidden"> (se abre en otra pestaña)</span>
            </a>
          )}
          {target.file && <a className={styles.action} href={fileUrl(courseId, id, true)} download><Download size={16} aria-hidden="true" />Descargar</a>}
          {(target.externalUrl || target.lmsUrl) && <a className={styles.action} href={target.externalUrl ?? target.lmsUrl ?? '#'} target="_blank" rel="noopener noreferrer"><ExternalLink size={16} aria-hidden="true" />{target.externalUrl ? 'Abrir enlace' : 'Abrir en Blackboard'}<span className="visually-hidden"> (se abre en otra pestaña)</span></a>}
          <button ref={closeRef} type="button" className={styles.close} onClick={onClose} aria-label="Cerrar"><X size={20} aria-hidden="true" /></button>
        </div>
      </header>

      <div className={styles.sub}>
        {showTabs && (
        <div className={styles.tabs} role="tablist" aria-label="Vista del documento">
        <button type="button" role="tab" aria-selected={tab === 'file'} onClick={() => setTab('file')}><FileText size={15} aria-hidden="true" />Documento{office && <small>tal cual</small>}</button>
        <button type="button" role="tab" aria-selected={tab === 'text'} onClick={() => setTab('text')}><Search size={15} aria-hidden="true" />Texto y búsqueda{pv?.kind === 'pdf' && <b className="tabular">{pv.pages} pág.</b>}</button>
        </div>
        )}
        <ReviewBar courseId={courseId} id={id} data={data} loading={preview.isPending} />
      </div>

      <div className={cx(styles.body, faithful && tab === 'file' && styles.bodyFrame)}>
        {faithful && tab === 'file' && (
          <div className={styles.frameBox}>
            {!frameReady && <Loading text={office ? 'Preparando el documento tal cual…' : 'Abriendo el PDF…'} />}
            <iframe className={cx(styles.frame, frameReady && styles.frameOn)} src={`${isPdf ? fileUrl(courseId, id) : renderUrl(courseId, id)}#navpanes=0&view=${isSlides ? 'Fit' : 'FitH'}`} title={target.title}
              onLoad={(event) => {
                // Si el servidor respondió con un error (JSON) en lugar del PDF, se pasa a la vista de texto.
                let type = '';
                try { type = event.currentTarget.contentDocument?.contentType ?? ''; } catch { /* mismo origen: no debería fallar */ }
                if (type.includes('json') || type.includes('html')) { setRenderFailed(true); setTab('text'); return; }
                setFrameReady(true);
              }} />
          </div>
        )}
        {isImage && <div className={styles.media}><img src={fileUrl(courseId, id)} alt={target.title} onError={() => setMediaError(true)} />{mediaError && <Notice title="No pudimos cargar la imagen" />}</div>}
        {(isVideo || isAudio) && (
          <div className={styles.media}>
            {isVideo
              ? <video controls preload="metadata" src={fileUrl(courseId, id)} onError={() => setMediaError(true)} />
              : <audio controls preload="metadata" src={fileUrl(courseId, id)} onError={() => setMediaError(true)} />}
            {mediaError && <Notice title="Este archivo no se puede reproducir aquí">Puede ser demasiado grande (más de 150 MB) o no estar disponible. Ábrelo en Blackboard.</Notice>}
          </div>
        )}
        {yt && (
          <div className={styles.video}>
            <iframe src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(yt)}`} title={target.title} allow="encrypted-media; fullscreen; picture-in-picture" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" />
          </div>
        )}

        {needsPreview && !isPdf && !yt && !(office && faithful && tab === 'file') && (
          preview.isPending ? <Loading text="Preparando la vista…" />
            : preview.error ? <Notice title="No pudimos abrir este archivo">{problemText(preview.error)}</Notice>
              : pv ? <PreviewBody pv={pv} target={target} /> : null
        )}
        {renderFailed && office && <p className={styles.noteBar} role="status">No pudimos mostrar el documento tal cual en este equipo; te dejamos su texto.</p>}
        {isPdf && tab === 'text' && (
          preview.isPending ? <Loading text="Leyendo el texto del PDF…" />
            : preview.error ? <Notice title="No pudimos leer el texto">{problemText(preview.error)}</Notice>
              : pv?.kind === 'pdf' ? (pv.scanned ? <Notice icon={FileImage} title="Este PDF es un escaneo">No tiene texto que podamos leer (haría falta OCR). Míralo en la pestaña Documento.</Notice> : <TextView text={pv.text} />)
                : <Notice title="Sin texto disponible" />
        )}
      </div>
    </>
  );
}

function PreviewBody({ pv, target }: { pv: Preview; target: ViewerTarget }) {
  switch (pv.kind) {
    case 'docx': return <article className={styles.doc} dangerouslySetInnerHTML={{ __html: pv.html }} />;
    case 'document': return <article className={styles.doc} dangerouslySetInnerHTML={{ __html: pv.html }} />;
    case 'pptx': return <SlidesView slides={pv.slides} />;
    case 'xlsx': return <SheetsView sheets={pv.sheets} />;
    case 'text': return <TextView text={pv.text} />;
    case 'pdf': return <TextView text={pv.text} />;
    case 'link': return <Notice icon={Link2} title="Enlace externo">Este recurso apunta a otro sitio. Ábrelo con el botón de arriba: <b>{(() => { try { return new URL(pv.url).hostname; } catch { return pv.url; } })()}</b></Notice>;
    default:
      return pv.reason === 'unsupported'
        ? <Notice icon={File} title="No hay vista previa de este formato">{target.file ? 'Puedes descargarlo con el botón de arriba y abrirlo en tu equipo.' : 'Ábrelo desde Blackboard.'}</Notice>
        : pv.reason === 'too_large' ? <Notice icon={File} title="Archivo muy grande para la vista previa">Descárgalo con el botón de arriba.</Notice>
          : pv.reason === 'unreadable' ? <Notice title="No pudimos leer este archivo">Puede estar dañado o protegido. Descárgalo para abrirlo en tu equipo.</Notice>
            : <Notice icon={File} title="Este recurso no tiene contenido propio" />;
  }
}

/** Estado de lectura: lo que Blackboard ya sabe, y la marca manual del estudiante (se envía en la siguiente actualización). */
function ReviewBar({ courseId, id, data, loading }: { courseId: string; id: string; data: ContentPreview | undefined; loading: boolean }) {
  const set = useSetReviewed(courseId, id);
  const review = data?.review ?? null;
  const total = data?.completion?.total ?? 0;
  const completed = total > 0 && (data?.completion?.completed ?? 0) >= total;
  const state: 'none' | ReviewMark['state'] = review?.state ?? 'none';
  const copy = REVIEW_COPY[state];
  const Icon = state === 'sent' ? BookCheck : state === 'pending' ? Clock : state === 'failed' ? AlertTriangle : BookOpenCheck;
  return (
    <div className={cx(styles.review, styles[`review_${state}`])}>
      <div className={styles.reviewInfo}>
        <span className={styles.reviewIcon}><Icon size={18} aria-hidden="true" /></span>
        <span className={styles.reviewText}>
          <strong>{review?.alreadyCompleted ? 'UTEC ya lo tenía completado' : copy.label}</strong>
          <small>{review?.state === 'sent' && review.sentAt ? `Enviado el ${formatDateTime(review.sentAt)} · ` : review?.state === 'pending' ? `Marcado el ${formatDateTime(review.markedAt)} · ` : ''}{review?.alreadyCompleted ? 'No hizo falta enviar nada.' : copy.hint}</small>
        </span>
      </div>
      <div className={styles.reviewActions}>
        {completed && <span className={styles.utecDone}><CircleCheck size={15} aria-hidden="true" />Completado en UTEC</span>}
        {(state === 'none' || state === 'failed') && !completed && (
          <button type="button" className={styles.reviewBtn} disabled={loading || set.isPending} onClick={() => set.mutate(true)}>
            {set.isPending ? <Loader2 size={16} aria-hidden="true" /> : state === 'failed' ? <Send size={16} aria-hidden="true" /> : <Check size={16} aria-hidden="true" />}
            {set.isPending ? 'Enviando a UTEC…' : state === 'failed' ? 'Reintentar' : 'Marcar como leído'}
          </button>
        )}
        {state === 'pending' && (
          <button type="button" className={styles.reviewUndo} disabled={set.isPending} onClick={() => set.mutate(false)}><Undo2 size={15} aria-hidden="true" />Quitar</button>
        )}
      </div>
      {set.isPending && <p className={styles.reviewSending} role="status">Conectando con Blackboard… la primera vez puede tardar unos segundos.</p>}
      {set.error && <p className={styles.reviewError} role="alert">{set.error instanceof ApiError ? set.error.message : 'No se pudo guardar la marca.'}</p>}
    </div>
  );
}


