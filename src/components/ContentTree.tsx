import {
  ArrowTopRightOnSquareIcon, ChatBubbleLeftRightIcon, ChevronRightIcon, ClipboardDocumentCheckIcon, DocumentIcon, DocumentTextIcon,
  FolderIcon, LinkIcon, RectangleStackIcon,
} from '@heroicons/react/24/outline';
import { AnimatePresence, motion } from 'motion/react';
import { useReducedMotion } from '../lib/motion';
import { useMemo, useState, type ComponentType, type SVGProps } from 'react';
import type { ContentItem } from '../api/types';
import { formatShortDate, handlerLabel } from '../lib/format';
import { Highlight, SearchInput, normalize } from './Filters';
import { Button } from './ui';
import styles from './ContentTree.module.css';

type Node = ContentItem & { children: Node[] };

const ICONS: Record<string, ComponentType<SVGProps<SVGSVGElement>>> = {
  'resource/x-bb-folder': FolderIcon,
  'resource/x-bb-lesson': RectangleStackIcon,
  'resource/x-bb-document': DocumentTextIcon,
  'resource/x-bb-file': DocumentIcon,
  'resource/x-bb-externallink': LinkIcon,
  'resource/x-bb-courselink': LinkIcon,
  'resource/x-bb-asmt-test-link': ClipboardDocumentCheckIcon,
  'resource/x-bb-forumlink': ChatBubbleLeftRightIcon,
};
const EXPAND_ALL_LIMIT = 150;

function buildTree(items: ContentItem[]): Node[] {
  const byId = new Map<string, Node>(items.map((item) => [item.id, { ...item, children: [] }]));
  const roots: Node[] = [];
  for (const node of byId.values()) {
    const parent = node.parentId ? byId.get(node.parentId) : undefined;
    (parent ? parent.children : roots).push(node);
  }
  const sort = (nodes: Node[]) => {
    nodes.sort((a, b) => (a.rootKind === b.rootKind ? 0 : a.rootKind === 'outline' ? -1 : 1) || (a.position ?? 0) - (b.position ?? 0));
    nodes.forEach((node) => sort(node.children));
  };
  sort(roots);
  return roots;
}

/** Filtra el árbol a las ramas con coincidencias y devuelve las carpetas a abrir. */
function filterTree(nodes: Node[], needle: string, open: Set<string>): Node[] {
  const out: Node[] = [];
  for (const node of nodes) {
    const children = filterTree(node.children, needle, open);
    if (normalize(node.title).includes(needle) || children.length > 0) {
      if (children.length > 0) open.add(node.id);
      out.push({ ...node, children });
    }
  }
  return out;
}

function TreeNode({ node, open, toggle, query }: { node: Node; open: Set<string>; toggle: (id: string) => void; query: string }) {
  const reduce = useReducedMotion();
  const Icon = ICONS[node.handler] ?? DocumentIcon;
  const isFolder = node.children.length > 0;
  const isOpen = isFolder && open.has(node.id);
  const iconClass = node.handler === 'resource/x-bb-folder' || node.handler === 'resource/x-bb-lesson' ? styles.iconFolder
    : node.handler === 'resource/x-bb-asmt-test-link' ? styles.iconAssessment : '';
  const meta = [handlerLabel(node.handler), isFolder ? `${node.children.length} ${node.children.length === 1 ? 'elemento' : 'elementos'}` : null,
    node.dueAt ? `vence ${formatShortDate(node.dueAt)}` : null, node.visibility === 'PARTIALLY_VISIBLE' ? 'disponibilidad condicionada' : null]
    .filter(Boolean).join(' · ');
  const inner = (
    <>
      <span className={`${styles.icon} ${iconClass}`} aria-hidden="true"><Icon /></span>
      <span className={styles.text}>
        <span className={styles.title} style={{ display: 'block' }}><Highlight text={node.title} query={query} /></span>
        <span className={styles.meta} style={{ display: 'block' }}>{meta}</span>
      </span>
    </>
  );

  return (
    <li className={isOpen ? styles.open : undefined}>
      {isFolder ? (
        <button type="button" className={styles.node} onClick={() => toggle(node.id)} aria-expanded={isOpen}>
          {inner}<ChevronRightIcon className={styles.chevron} aria-hidden="true" />
        </button>
      ) : node.externalUrl ? (
        <a className={styles.node} href={node.externalUrl} target="_blank" rel="noopener noreferrer">
          {inner}<ArrowTopRightOnSquareIcon className={styles.chevron} aria-hidden="true" /><span className="visually-hidden">(se abre en otra pestaña)</span>
        </a>
      ) : (
        <div className={styles.node}>{inner}</div>
      )}
      {!isFolder && node.bodyText && (
        <p className={styles.excerpt}>{node.bodyText.length > 280 ? `${node.bodyText.slice(0, 280).trimEnd()}…` : node.bodyText}</p>
      )}
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.ul className={styles.children}
            initial={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }} animate={reduce ? { opacity: 1 } : { height: 'auto', opacity: 1 }}
            exit={reduce ? { opacity: 0 } : { height: 0, opacity: 0, transition: { duration: 0.16 } }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}>
            {node.children.map((child) => <TreeNode key={child.id} node={child} open={open} toggle={toggle} query={query} />)}
          </motion.ul>
        )}
      </AnimatePresence>
    </li>
  );
}

/** El estado de apertura vive en el padre (`open`) para conservarlo al cambiar de pestaña. */
export function ContentTree({ items, open, onOpenChange }: { items: ContentItem[]; open: Set<string>; onOpenChange: (open: Set<string>) => void }) {
  const [query, setQuery] = useState('');
  const roots = useMemo(() => buildTree(items), [items]);
  const folderIds = useMemo(() => items.filter((item) => items.some((child) => child.parentId === item.id)).map((item) => item.id), [items]);
  const needle = normalize(query.trim());
  const searchOpen = new Set<string>();
  const visibleRoots = needle ? filterTree(roots, needle, searchOpen) : roots;
  const effectiveOpen = needle ? searchOpen : open;
  const matches = needle ? items.filter((item) => normalize(item.title).includes(needle)).length : 0;

  const toggle = (id: string) => {
    if (needle) return;
    const next = new Set(open);
    if (next.has(id)) next.delete(id); else next.add(id);
    onOpenChange(next);
  };

  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', marginBottom: 'var(--space-4)' }}>
        <SearchInput label="Buscar en el contenido" value={query} onChange={setQuery} />
        <Button variant="secondary" disabled={Boolean(needle) || folderIds.length > EXPAND_ALL_LIMIT}
          title={folderIds.length > EXPAND_ALL_LIMIT ? `Hay demasiadas carpetas (${folderIds.length}); usa la búsqueda.` : undefined}
          onClick={() => onOpenChange(new Set(folderIds))}>Expandir todo</Button>
        <Button variant="ghost" disabled={Boolean(needle) || open.size === 0} onClick={() => onOpenChange(new Set())}>Contraer todo</Button>
      </div>
      {needle && <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-ink-3)', marginBottom: 'var(--space-3)' }} aria-live="polite">
        {matches === 0 ? 'Sin coincidencias.' : `${matches} ${matches === 1 ? 'coincidencia' : 'coincidencias'}`}
      </p>}
      <ul className={styles.tree}>
        {visibleRoots.map((node) => <TreeNode key={node.id} node={node} open={effectiveOpen} toggle={toggle} query={query} />)}
      </ul>
    </div>
  );
}
