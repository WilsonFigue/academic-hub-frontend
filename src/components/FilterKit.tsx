import * as Popover from '@radix-ui/react-popover';
import { Check, ChevronDown, type LucideIcon } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useId, useRef, useState, type KeyboardEvent } from 'react';
import styles from './FilterKit.module.css';

const cx = (...names: Array<string | false | null | undefined>) => names.filter(Boolean).join(' ');
const ease = [0.22, 1, 0.36, 1] as const;

export type KitOption<T extends string> = { value: T; label: string; icon?: LucideIcon; color?: string; count?: number; hint?: string };

/** Selector rápido: una sola barra con una píldora que se desliza hacia la opción elegida (con icono, color y contador). */
export function SegTabs<T extends string>({ label, value, options, onChange, iconOnly = false }: {
  label: string; value: T; options: Array<KitOption<T>>; onChange: (value: T) => void; iconOnly?: boolean;
}) {
  const pill = useId();
  return (
    <div className={cx(styles.seg, iconOnly && styles.segIcons)} role="group" aria-label={label}>
      {options.map((option) => {
        const Icon = option.icon;
        const on = value === option.value;
        return (
          <button key={option.value} type="button" className={cx(styles.segBtn, on && styles.segOn)} style={{ ['--s' as string]: option.color ?? 'var(--text)' }} aria-pressed={on}
            aria-label={iconOnly ? `${option.label}${option.count !== undefined ? `, ${option.count}` : ''}` : undefined} data-tip={iconOnly ? option.label : undefined}
            disabled={option.count === 0 && !on} onClick={() => onChange(option.value)}>
            {on && <motion.span layoutId={pill} className={styles.segPill} transition={{ type: 'spring', stiffness: 520, damping: 40 }} />}
            <span className={styles.segFace}>
              {Icon && <Icon size={iconOnly ? 20 : 17} aria-hidden="true" />}
              {!iconOnly && option.label}
              {option.count !== undefined && <b className="tabular">{option.count}</b>}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/**
 * Menú de filtro u orden: un botón con su icono que muestra la opción elegida y despliega la lista con iconos, colores y contadores.
 * `neutral` es el valor que equivale a "sin filtro": con otro valor el botón se pinta como activo.
 */
export function FilterMenu<T extends string>({ label, icon: Icon, value, options, onChange, neutral, compact = false, tipEnd = false }: {
  label: string; icon: LucideIcon; value: T; options: Array<KitOption<T>>; onChange: (value: T) => void; neutral?: T; compact?: boolean; tipEnd?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const list = useRef<HTMLDivElement>(null);
  const current = options.find((option) => option.value === value);
  const active = neutral !== undefined && value !== neutral;
  const onKey = (event: KeyboardEvent) => {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    event.preventDefault();
    const items = [...(list.current?.querySelectorAll<HTMLButtonElement>('button') ?? [])];
    const at = items.indexOf(document.activeElement as HTMLButtonElement);
    items[(at + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length]?.focus();
  };

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button type="button" className={cx(styles.menuBtn, compact && styles.menuCompact, compact && tipEnd && styles.menuTipEnd, active && styles.menuActive, open && styles.menuOpen)} style={{ ['--s' as string]: current?.color ?? 'var(--accent)' }} aria-label={`${label}: ${current?.label ?? ''}`} data-tip={compact && !open ? `${label}: ${current?.label ?? ''}` : undefined}>
          <Icon size={compact ? 20 : 17} aria-hidden="true" />
          {!compact && <span className={styles.menuText}><small>{label}</small>{current?.label}</span>}
          {!compact && <ChevronDown size={16} className={styles.menuChev} aria-hidden="true" />}
          {compact && active && <i className={styles.menuDot} aria-hidden="true" />}
        </button>
      </Popover.Trigger>
      <AnimatePresence>
        {open && (
          <Popover.Portal forceMount>
            <Popover.Content asChild forceMount align="start" sideOffset={8} collisionPadding={12} onOpenAutoFocus={(event) => { event.preventDefault(); list.current?.querySelector<HTMLButtonElement>('[aria-checked=true]')?.focus(); }}>
              <motion.div ref={list} className={styles.panel} role="radiogroup" aria-label={label} onKeyDown={onKey}
                initial={{ opacity: 0, y: -8, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6, scale: 0.97, transition: { duration: 0.12 } }} transition={{ duration: 0.22, ease }}>
                <p className={styles.panelTitle}>{label}</p>
                {options.map((option, i) => {
                  const OptionIcon = option.icon;
                  const on = option.value === value;
                  return (
                    <motion.button key={option.value} type="button" role="radio" aria-checked={on} className={cx(styles.opt, on && styles.optOn)} style={{ ['--s' as string]: option.color ?? 'var(--accent)' }}
                      onClick={() => { onChange(option.value); setOpen(false); }} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.22, delay: 0.03 + i * 0.025, ease }}>
                      <span className={styles.optIcon}>{OptionIcon ? <OptionIcon size={17} aria-hidden="true" /> : <i />}</span>
                      <span className={styles.optText}>{option.label}{option.hint && <small>{option.hint}</small>}</span>
                      {option.count !== undefined && <b className="tabular">{option.count}</b>}
                      <Check size={16} className={styles.optCheck} aria-hidden="true" />
                    </motion.button>
                  );
                })}
              </motion.div>
            </Popover.Content>
          </Popover.Portal>
        )}
      </AnimatePresence>
    </Popover.Root>
  );
}

/** Menú de casillas: cada opción se activa o desactiva sin cerrar el panel; admite una acción final (p. ej. restablecer). */
export function ToggleMenu<T extends string>({ label, icon: Icon, summary, options, onToggle, action, active, compact = false, badge }: {
  label: string; icon: LucideIcon; summary: string; options: Array<KitOption<T> & { on: boolean }>; onToggle: (value: T) => void;
  action?: { label: string; icon: LucideIcon; onRun: () => void; disabled?: boolean }; active?: boolean; compact?: boolean; badge?: string;
}) {
  const [open, setOpen] = useState(false);
  const list = useRef<HTMLDivElement>(null);
  const onKey = (event: KeyboardEvent) => {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    event.preventDefault();
    const items = [...(list.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') ?? [])];
    const at = items.indexOf(document.activeElement as HTMLButtonElement);
    items[(at + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length]?.focus();
  };
  const ActionIcon = action?.icon;

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button type="button" className={cx(styles.menuBtn, compact && styles.menuCompact, active && styles.menuActive, open && styles.menuOpen)} aria-label={`${label}: ${summary}`} data-tip={compact && !open ? `${label}: ${summary}` : undefined}>
          <Icon size={compact ? 20 : 17} aria-hidden="true" />
          {!compact && <span className={styles.menuText}><small>{label}</small>{summary}</span>}
          {!compact && <ChevronDown size={16} className={styles.menuChev} aria-hidden="true" />}
          {compact && badge && <b className={styles.menuBadge}>{badge}</b>}
        </button>
      </Popover.Trigger>
      <AnimatePresence>
        {open && (
          <Popover.Portal forceMount>
            <Popover.Content asChild forceMount align="start" sideOffset={8} collisionPadding={12} onOpenAutoFocus={(event) => { event.preventDefault(); list.current?.querySelector<HTMLButtonElement>('button')?.focus(); }}>
              <motion.div ref={list} className={styles.panel} role="group" aria-label={label} onKeyDown={onKey}
                initial={{ opacity: 0, y: -8, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6, scale: 0.97, transition: { duration: 0.12 } }} transition={{ duration: 0.22, ease }}>
                <p className={styles.panelTitle}>{label}</p>
                {options.map((option, i) => {
                  const OptionIcon = option.icon;
                  return (
                    <motion.button key={option.value} type="button" role="checkbox" aria-checked={option.on} className={cx(styles.opt, option.on && styles.optOn)} style={{ ['--s' as string]: option.color ?? 'var(--accent)' }}
                      onClick={() => onToggle(option.value)} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.22, delay: 0.03 + i * 0.025, ease }}>
                      <span className={styles.optIcon}>{OptionIcon ? <OptionIcon size={17} aria-hidden="true" /> : <i />}</span>
                      <span className={styles.optText}>{option.label}{option.hint && <small>{option.hint}</small>}</span>
                      {option.count !== undefined && <b className="tabular">{option.count}</b>}
                      <Check size={16} className={styles.optCheck} aria-hidden="true" />
                    </motion.button>
                  );
                })}
                {action && ActionIcon && (
                  <button type="button" className={styles.optAction} disabled={action.disabled} onClick={action.onRun}><ActionIcon size={15} aria-hidden="true" />{action.label}</button>
                )}
              </motion.div>
            </Popover.Content>
          </Popover.Portal>
        )}
      </AnimatePresence>
    </Popover.Root>
  );
}
