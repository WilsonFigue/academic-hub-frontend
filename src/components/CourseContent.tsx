import {
  ArrowDownAZ, BookOpenCheck, CalendarArrowDown, CalendarArrowUp, CalendarClock, ChevronRight, ClipboardCheck, Layers as LayersAll, ListOrdered, FileType, ExternalLink, File, FileArchive, FileImage, FileSpreadsheet, FileText, Eye, FileVideo, Folder, FolderOpen, Layers, Link2, Lock, MessagesSquare, Presentation, Search, X,
  type LucideIcon,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useMemo, useState } from 'react';
import type { ContentItem } from '../api/types';
import { useReducedMotion } from '../lib/motion';
import { formatRelative, formatShortDate, handlerLabel } from '../lib/format';
import { Highlight, normalize } from './Filters';
import { fileLook, formatBytes } from './FileViewer';
import { FilterMenu, SegTabs } from './FilterKit';
import styles from './CourseContent.module.css';

const ease = [0.22, 1, 0.36, 1] as const;
const cx = (...names: Array<string | false | null | undefined>) => names.filter(Boolean).join(' ');
type Node = ContentItem & { children: Node[] };
type Kind = 'folder' | 'lesson' | 'document' | 'file' | 'link' | 'assessment' | 'forum' | 'other';
type Filter = 'all' | Exclude<Kind, 'other'>;

const KINDS: Record<Kind, { label: string; plural: string; icon: LucideIcon; color: string }> = {
  folder: { label: 'Carpeta', plural: 'Carpetas', icon: Folder, color: 'var(--amber)' },
  lesson: { label: 'Lección', plural: 'Lecciones', icon: Layers, color: 'var(--pink)' },
  document: { label: 'Documento', plural: 'Documentos', icon: FileText, color: 'var(--teal)' },
  file: { label: 'Archivo', plural: 'Archivos', icon: File, color: 'var(--sky)' },
  link: { label: 'Enlace', plural: 'Enlaces', icon: Link2, color: 'var(--mint)' },
  assessment: { label: 'Evaluación', plural: 'Evaluaciones', icon: ClipboardCheck, color: 'var(--accent)' },
  forum: { label: 'Foro', plural: 'Foros', icon: MessagesSquare, color: '#7c5ce6' },
  other: { label: 'Recurso', plural: 'Recursos', icon: File, color: 'var(--muted)' },
};
const FILTERS: Array<Exclude<Kind, 'other'>> = ['folder', 'document', 'file', 'link', 'assessment', 'forum', 'lesson'];

function kindOf(item: ContentItem): Kind {
  switch (item.handler) {
    case 'resource/x-bb-folder': return 'folder';
    case 'resource/x-bb-lesson': return 'lesson';
    case 'resource/x-bb-document': return 'document';
    case 'resource/x-bb-file': return 'file';
    case 'resource/x-bb-externallink': case 'resource/x-bb-courselink': return 'link';
    case 'resource/x-bb-asmt-test-link': case 'resource/x-bb-assignment': return 'assessment';
    case 'resource/x-bb-forumlink': return 'forum';
    default: return 'other';
  }
}

/** Tipo de archivo por la extensión del título o del enlace: así un PDF se distingue de una presentación. */
const FILE_TYPES: Array<[RegExp, { tag: string; icon: LucideIcon; color: string }]> = [
  [/\.pdf\b/i, { tag: 'PDF', icon: FileText, color: '#e5392f' }],
  [/\.(pptx?|key)\b/i, { tag: 'PPT', icon: Presentation, color: '#ea580c' }],
  [/\.(docx?|rtf|odt)\b/i, { tag: 'DOC', icon: FileText, color: '#2f7cf6' }],
  [/\.(xlsx?|csv)\b/i, { tag: 'XLS', icon: FileSpreadsheet, color: '#0f9f6e' }],
  [/\.(zip|rar|7z)\b/i, { tag: 'ZIP', icon: FileArchive, color: '#a16207' }],
  [/\.(mp4|mov|mkv|webm)\b/i, { tag: 'VIDEO', icon: FileVideo, color: '#7c5ce6' }],
  [/\.(png|jpe?g|gif|webp|svg)\b/i, { tag: 'IMG', icon: FileImage, color: '#db2777' }],
];

function look(item: ContentItem) {
  const kind = kindOf(item);
  const base = KINDS[kind];
  if (kind === 'file' && item.file) {
    const found = fileLook(item.file.mimeType, item.file.name);
    return { kind, ...base, icon: found.icon, color: found.color, tag: found.tag };
  }
  if (kind === 'file' || kind === 'link' || kind === 'other') {
    const found = FILE_TYPES.find(([re]) => re.test(item.title) || re.test(item.externalUrl ?? ''));
    if (found) return { kind, ...base, icon: found[1].icon, color: found[1].color, tag: found[1].tag };
  }
  return { kind, ...base, tag: null as string | null };
}

const isYouTube = (url: string | null) => /^https?:\/\/(www\.)?(youtube\.com|youtu\.be)\//.test(url ?? '');
/** Archivos, documentos con texto y videos de YouTube se abren en el visor; el resto, como siempre. */
const viewable = (item: ContentItem) => Boolean(item.file) || (item.handler === 'resource/x-bb-document' && Boolean(item.bodyText)) || isYouTube(item.externalUrl);

type Sort = 'original' | 'new' | 'old' | 'name' | 'due';
const SORTS = [
  { value: 'original' as const, label: 'Como en Blackboard', icon: ListOrdered, hint: 'El orden que puso el docente' },
  { value: 'new' as const, label: 'Más recientes primero', icon: CalendarArrowDown, hint: 'Por fecha de actualización' },
  { value: 'old' as const, label: 'Más antiguos primero', icon: CalendarArrowUp, hint: 'Por fecha de actualización' },
  { value: 'name' as const, label: 'Nombre A–Z', icon: ArrowDownAZ },
  { value: 'due' as const, label: 'Próximo vencimiento', icon: CalendarClock, hint: 'Los que tienen fecha de entrega' },
];
const time = (iso: string | null) => (iso ? Date.parse(iso) : null);

function compare(sort: Sort): ((a: ContentItem, b: ContentItem) => number) | null {
  if (sort === 'original') return null;
  if (sort === 'name') return (a, b) => a.title.localeCompare(b.title, 'es', { numeric: true });
  const get = (item: ContentItem) => time(sort === 'due' ? item.dueAt : item.modifiedAt);
  return (a, b) => {
    const x = get(a); const y = get(b);
    if (x === null || y === null) return x === y ? 0 : x === null ? 1 : -1;
    return sort === 'new' ? y - x : x - y;
  };
}

function buildTree(items: ContentItem[], sortBy: Sort = 'original'): Node[] {
  const byId = new Map<string, Node>(items.map((item) => [item.id, { ...item, children: [] }]));
  const roots: Node[] = [];
  for (const node of byId.values()) {
    const parent = node.parentId ? byId.get(node.parentId) : undefined;
    (parent ? parent.children : roots).push(node);
  }
  const cmp = compare(sortBy);
  const sort = (nodes: Node[]) => {
    nodes.sort((a, b) => (a.rootKind === b.rootKind ? 0 : a.rootKind === 'outline' ? -1 : 1) || (cmp ? (a.children.length > 0) === (b.children.length > 0) ? cmp(a, b) : a.children.length > 0 ? -1 : 1 : 0) || (a.position ?? 0) - (b.position ?? 0));
    nodes.forEach((node) => sort(node.children));
  };
  sort(roots);
  return roots;
}

function Row({ node, open, toggle, query, flatPath, depth = 0, index = 0, onView }: {
  node: Node; open: Set<string>; toggle: (id: string) => void; query: string; flatPath?: string; depth?: number; index?: number; onView: (item: ContentItem) => void;
}) {
  const reduce = useReducedMotion();
  const v = look(node);
  const Icon = v.kind === 'folder' && open.has(node.id) ? FolderOpen : v.icon;
  const isFolder = node.children.length > 0;
  const isOpen = isFolder && open.has(node.id);
  const done = node.completion?.total ? Math.round(((node.completion.completed ?? 0) / node.completion.total) * 100) : null;
  const style = { ['--k' as string]: v.color };
  const inner = (
    <>
      <span className={styles.disc} aria-hidden="true"><Icon size={22} strokeWidth={1.9} /></span>
      <span className={styles.text}>
        <span className={styles.title}><Highlight text={node.title} query={query} /></span>
        <span className={styles.meta}>
          {flatPath && <span className={styles.path}>{flatPath}</span>}
          <span className={styles.type}>{v.tag ?? v.label}</span>
          {isFolder && <span>{node.children.length} {node.children.length === 1 ? 'elemento' : 'elementos'}</span>}
          {node.dueAt && <span className={styles.due}>vence {formatShortDate(node.dueAt)}</span>}
          {node.file && <span>{formatBytes(node.file.size)}</span>}
          {node.modifiedAt && !isFolder && <span>actualizado {formatRelative(node.modifiedAt)}</span>}
          {node.review && <span className={cx(styles.read, styles[`read_${node.review.state}`])}><BookOpenCheck size={12} aria-hidden="true" />{node.review.alreadyCompleted ? 'Ya completado en UTEC' : node.review.state === 'pending' ? 'Leído · por enviar a UTEC' : node.review.state === 'sent' ? 'Leído · enviado a UTEC' : 'No se pudo enviar'}</span>}
          {node.visibility === 'PARTIALLY_VISIBLE' && <span className={styles.lock}><Lock size={12} aria-hidden="true" />condicionado</span>}
          {done !== null && <span className={styles.done}><i><b style={{ width: `${done}%` }} /></i>{done}%</span>}
        </span>
      </span>
    </>
  );

  return (
    <motion.li className={cx(styles.li, isOpen && styles.liOpen)} style={style}
      initial={reduce ? false : { opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, transition: { duration: 0.12 } }}
      transition={{ duration: 0.38, delay: depth === 0 ? Math.min(index, 10) * 0.04 : Math.min(index, 6) * 0.03, ease }}>
      {isFolder ? (
        <button type="button" className={cx(styles.node, styles.nodeFolder)} onClick={() => toggle(node.id)} aria-expanded={isOpen}>
          {inner}<ChevronRight className={styles.chev} size={20} aria-hidden="true" />
        </button>
      ) : viewable(node) ? (
        <button type="button" className={styles.node} onClick={() => onView(node)}>
          {inner}<span className={styles.open}><Eye size={15} aria-hidden="true" />Ver</span>
        </button>
      ) : node.externalUrl ? (
        <a className={styles.node} href={node.externalUrl} target="_blank" rel="noopener noreferrer">
          {inner}<span className={styles.open}><ExternalLink size={15} aria-hidden="true" />Abrir</span><span className="visually-hidden">(se abre en otra pestaña)</span>
        </a>
      ) : <div className={cx(styles.node, styles.nodeStatic)}>{inner}</div>}
      {!isFolder && node.bodyText && <p className={styles.excerpt}>{node.bodyText.length > 240 ? `${node.bodyText.slice(0, 240).trimEnd()}…` : node.bodyText}</p>}
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.ul className={styles.children} initial={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }} animate={reduce ? { opacity: 1 } : { height: 'auto', opacity: 1 }}
            exit={reduce ? { opacity: 0 } : { height: 0, opacity: 0, transition: { duration: 0.18 } }} transition={{ duration: 0.3, ease }}>
            {node.children.map((child, i) => <Row key={child.id} node={child} open={open} toggle={toggle} query={query} depth={depth + 1} index={i} onView={onView} />)}
          </motion.ul>
        )}
      </AnimatePresence>
    </motion.li>
  );
}

/**
 * Pestaña Contenido. Cada tipo de recurso tiene su color e icono (y los archivos, su formato). Con búsqueda o un filtro de tipo la
 * vista pasa a una lista plana con la ruta de carpetas; sin ellos es el árbol de carpetas, que conserva lo abierto al cambiar de pestaña.
 */
export function CourseContent({ items, open, onOpenChange, onView }: { items: ContentItem[]; open: Set<string>; onOpenChange: (open: Set<string>) => void; onView: (item: ContentItem) => void }) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [sort, setSort] = useState<Sort>('original');
  const [format, setFormat] = useState('all');
  const roots = useMemo(() => buildTree(items, sort), [items, sort]);
  const formats = useMemo(() => {
    const c = new Map<string, number>();
    items.forEach((item) => { const tag = look(item).tag; if (tag) c.set(tag, (c.get(tag) ?? 0) + 1); });
    return [...c.entries()].sort((a, b) => b[1] - a[1]);
  }, [items]);
  const byId = useMemo(() => new Map(items.map((item) => [item.id, item])), [items]);
  const folderIds = useMemo(() => items.filter((item) => items.some((child) => child.parentId === item.id)).map((item) => item.id), [items]);
  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    items.forEach((item) => { const k = kindOf(item); c[k] = (c[k] ?? 0) + 1; });
    return c;
  }, [items]);
  const needle = normalize(query.trim());
  const flat = needle !== '' || filter !== 'all' || format !== 'all' || sort !== 'original';
  const results = useMemo(() => {
    if (!flat) return [];
    const list = items.filter((item) => (filter === 'all' || kindOf(item) === filter) && (format === 'all' || look(item).tag === format) && (!needle || normalize(item.title).includes(needle)) && (sort !== 'due' || item.dueAt));
    const cmp = compare(sort);
    return cmp ? list.slice().sort(cmp) : list;
  }, [items, flat, filter, format, needle, sort]);
  const pathOf = (item: ContentItem) => {
    const names: string[] = [];
    for (let p = item.parentId ? byId.get(item.parentId) : undefined; p; p = p.parentId ? byId.get(p.parentId) : undefined) names.unshift(p.title);
    return names.length ? names.join(' › ') : 'Inicio de la materia';
  };
  const toggle = (id: string) => { const next = new Set(open); if (next.has(id)) next.delete(id); else next.add(id); onOpenChange(next); };

  return (
    <div>
      <div className={styles.tools}>
        <SegTabs<Filter> label="Tipo de recurso" iconOnly value={filter} onChange={(v) => setFilter(v === filter ? 'all' : v)} options={[
          { value: 'all', label: 'Todo', icon: LayersAll, count: items.length },
          ...FILTERS.filter((k) => counts[k]).map((k) => ({ value: k as Filter, label: KINDS[k].plural, icon: KINDS[k].icon, color: KINDS[k].color, count: counts[k] })),
        ]} />
        <div className={styles.menus}>
          {formats.length > 0 && (
            <FilterMenu<string> label="Formato" icon={FileType} value={format} onChange={setFormat} neutral="all" options={[
              { value: 'all', label: 'Todos los formatos' },
              ...formats.map(([tag, n]) => ({ value: tag, label: tag, count: n })),
            ]} />
          )}
          <FilterMenu<Sort> label="Ordenar" icon={ListOrdered} value={sort} onChange={setSort} neutral="original" options={SORTS} />
        </div>
        <label className={styles.search}>
          <Search size={16} aria-hidden="true" /><span className="visually-hidden">Buscar en el contenido</span>
          <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar en el contenido" autoComplete="off" spellCheck={false} />
          {query && <button type="button" className={styles.clear} onClick={() => setQuery('')} aria-label="Borrar búsqueda"><X size={14} aria-hidden="true" /></button>}
        </label>
      </div>

      {flat ? (
        <>
          <p className={styles.count} aria-live="polite">{results.length === 0 ? 'Sin coincidencias.' : `${results.length} ${results.length === 1 ? 'recurso' : 'recursos'}`}{sort === 'due' ? ' con fecha de entrega' : ''}<button type="button" className={styles.reset} onClick={() => { setQuery(''); setFilter('all'); setFormat('all'); setSort('original'); }}>Quitar filtros</button></p>
          <ul className={styles.tree}>
            <AnimatePresence mode="popLayout">
              {results.slice(0, 200).map((item, i) => <Row key={item.id} node={{ ...item, children: [] }} open={open} toggle={toggle} query={query} flatPath={pathOf(item)} index={i} onView={onView} />)}
            </AnimatePresence>
          </ul>
          {results.length > 200 && <p className={styles.count}>Mostrando los primeros 200; afina la búsqueda para ver el resto.</p>}
        </>
      ) : (
        <>
          <div className={styles.fold}>
            <button type="button" onClick={() => onOpenChange(new Set(folderIds))} disabled={folderIds.length > 150 || folderIds.length === 0}>Expandir todo</button>
            <button type="button" onClick={() => onOpenChange(new Set())} disabled={open.size === 0}>Contraer todo</button>
          </div>
          <ul className={styles.tree}>{roots.map((node, i) => <Row key={node.id} node={node} open={open} toggle={toggle} query="" index={i} onView={onView} />)}</ul>
        </>
      )}
    </div>
  );
}

export { handlerLabel };
