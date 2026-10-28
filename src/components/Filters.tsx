import { ChevronDownIcon, MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { motion } from 'motion/react';
import { useId, type ReactNode } from 'react';
import styles from './Filters.module.css';

/** Título de pantalla: un sustantivo (24–28 px) y una línea gris sobre los datos. Sin etiquetas encima. */
export function PageHeader({ title, lede, actions }: { title: string; lede?: ReactNode; actions?: ReactNode }) {
  return (
    <header className={styles.header}>
      <div style={{ minWidth: 0 }}>
        <h1 className={styles.title}>{title}</h1>
        {lede && <p className={styles.lede}>{lede}</p>}
      </div>
      {actions}
    </header>
  );
}

export function FilterBar({ children }: { children: ReactNode }) {
  return <div className={styles.bar} role="search">{children}</div>;
}

export function SearchInput({ value, onChange, label, placeholder }: { value: string; onChange: (value: string) => void; label: string; placeholder?: string }) {
  const id = useId();
  return (
    <div className={styles.search}>
      <label htmlFor={id} className="visually-hidden">{label}</label>
      <MagnifyingGlassIcon className={styles.searchIcon} aria-hidden="true" />
      <input id={id} type="search" className={styles.searchInput} value={value} placeholder={placeholder ?? label}
        onChange={(event) => onChange(event.target.value)} autoComplete="off" spellCheck={false} />
      {value && (
        <button type="button" className={styles.clear} onClick={() => onChange('')} aria-label="Borrar búsqueda">
          <XMarkIcon aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

export function Select<T extends string>({ label, value, options, onChange, allLabel }: {
  label: string; value: T | ''; options: Array<{ value: T; label: string }>; onChange: (value: T | '') => void; allLabel: string;
}) {
  const id = useId();
  return (
    <div className={`${styles.select} ${value ? styles.selectActive : ''}`}>
      <label htmlFor={id} className="visually-hidden">{label}</label>
      <select id={id} className={styles.selectControl} value={value} onChange={(event) => onChange(event.target.value as T | '')}>
        <option value="">{allLabel}</option>
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
      <ChevronDownIcon className={styles.chevron} aria-hidden="true" />
    </div>
  );
}

/** Opciones mutuamente excluyentes con una "píldora" animada que sigue a la opción elegida. */
export function Segmented<T extends string>({ label, value, options, onChange }: {
  label: string; value: T; options: Array<{ value: T; label: string; count?: number }>; onChange: (value: T) => void;
}) {
  const layoutId = useId();
  return (
    <div className={styles.segmented} role="group" aria-label={label}>
      {options.map((option) => (
        <button key={option.value} type="button" className={styles.segment} aria-pressed={value === option.value} onClick={() => onChange(option.value)}>
          {value === option.value && <motion.span layoutId={layoutId} className={styles.segmentPill} transition={{ type: 'spring', stiffness: 500, damping: 40 }} />}
          <span className={styles.segmentLabel}>
            {option.label}{option.count !== undefined && <span className={styles.count}>{option.count}</span>}
          </span>
        </button>
      ))}
    </div>
  );
}

export function ResultSummary({ shown, total, noun, onReset }: { shown: number; total: number; noun: string; onReset?: () => void }) {
  return (
    <div className={styles.summary} aria-live="polite">
      <span>{shown === total ? `${total} ${noun}` : `${shown} de ${total} ${noun}`}</span>
      {onReset && shown !== total && <button type="button" className={styles.reset} onClick={onReset}>Quitar filtros</button>}
    </div>
  );
}

/** Resalta las coincidencias de una búsqueda (sin HTML: solo nodos de texto). */
export function Highlight({ text, query }: { text: string; query: string }) {
  const needle = normalize(query.trim());
  if (!needle) return <>{text}</>;
  const haystack = normalize(text);
  const parts: ReactNode[] = [];
  let index = 0;
  for (let found = haystack.indexOf(needle); found !== -1; found = haystack.indexOf(needle, index)) {
    if (found > index) parts.push(text.slice(index, found));
    parts.push(<mark key={found} className={styles.mark}>{text.slice(found, found + needle.length)}</mark>);
    index = found + needle.length;
  }
  parts.push(text.slice(index));
  return <>{parts}</>;
}

/** Normalización para búsqueda: sin mayúsculas ni tildes, conservando la longitud del texto. */
export function normalize(value: string): string {
  return value.toLocaleLowerCase('es').normalize('NFD').replace(/[̀-ͯ]/g, '');
}
