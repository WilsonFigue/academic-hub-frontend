import { EyeIcon, EyeSlashIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline';
import { forwardRef, useId, useState, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode } from 'react';
import type { Tone } from '../lib/status';
import styles from './ui.module.css';

const cx = (...names: Array<string | false | null | undefined>) => names.filter(Boolean).join(' ');

export function Button({
  variant = 'primary', block, loading, children, className, disabled, ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost'; block?: boolean; loading?: boolean }) {
  return (
    <button {...props} disabled={disabled || loading} aria-busy={loading || undefined}
      className={cx(styles.button, styles[variant], block && styles.block, className)}>
      {loading && <span className={styles.spinner} aria-hidden="true" />}
      {children}
    </button>
  );
}

export function buttonClass(variant: 'primary' | 'secondary' | 'ghost' = 'secondary') {
  return cx(styles.button, styles[variant]);
}

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
  error?: string | null;
  revealable?: boolean;
}

export const TextField = forwardRef<HTMLInputElement, FieldProps>(function TextField({ label, hint, error, revealable, type = 'text', ...props }, ref) {
  const id = useId();
  const [revealed, setRevealed] = useState(false);
  const describedBy = [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(' ') || undefined;
  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={id}>{label}</label>
      <div className={styles.inputWrap}>
        <input ref={ref} id={id} {...props} type={revealable && revealed ? 'text' : type}
          aria-invalid={error ? true : undefined} aria-describedby={describedBy}
          className={cx(styles.input, revealable && styles.withAction)} />
        {revealable && (
          <button type="button" className={styles.inputAction} onClick={() => setRevealed((value) => !value)}
            aria-label={revealed ? 'Ocultar contraseña' : 'Mostrar contraseña'} aria-pressed={revealed}>
            {revealed ? <EyeSlashIcon aria-hidden="true" /> : <EyeIcon aria-hidden="true" />}
          </button>
        )}
      </div>
      {hint && !error && <p id={`${id}-hint`} className={styles.hint}>{hint}</p>}
      {error && (
        <p id={`${id}-error`} className={styles.fieldError} role="alert">
          <ExclamationCircleIcon aria-hidden="true" />{error}
        </p>
      )}
    </div>
  );
});

export function Badge({ tone = 'neutral', children }: { tone?: Tone; children: ReactNode }) {
  return <span className={cx(styles.badge, styles[`tone-${tone}`])}>{children}</span>;
}

export function Card({ children, padded = true, className, as: Tag = 'section', ...rest }:
  { children: ReactNode; padded?: boolean; className?: string; as?: 'section' | 'div' | 'article'; 'aria-labelledby'?: string }) {
  return <Tag {...rest} className={cx(styles.card, padded && styles.cardPadded, className)}>{children}</Tag>;
}

/** Título de panel (16/600), un contador opcional y una acción a la derecha ("Ver todo"). */
export function SectionHeader({ id, title, count, action }: { id?: string; title: string; count?: number; action?: ReactNode }) {
  return (
    <div className={styles.sectionHeader}>
      <h2 id={id} className={styles.sectionTitle}>
        {title}
        {count !== undefined && <span className={styles.count} aria-label={`${count} elementos`}>{count}</span>}
      </h2>
      {action}
    </div>
  );
}

export const sectionLinkClass = styles.sectionLink;

export function Skeleton({ width = '100%', height = 16, radius }: { width?: number | string; height?: number | string; radius?: number }) {
  return <span className={styles.skeleton} style={{ width, height, borderRadius: radius }} aria-hidden="true" />;
}

export function EmptyState({ icon, title, children, action, tone = 'accent' }:
  { icon: ReactNode; title: string; children?: ReactNode; action?: ReactNode; tone?: 'accent' | 'danger' }) {
  return (
    <div className={styles.empty}>
      <div className={cx(styles.emptyIcon, tone === 'danger' && styles.emptyIconDanger)} aria-hidden="true">{icon}</div>
      <p className={styles.emptyTitle}>{title}</p>
      {children && <p className={styles.emptyText}>{children}</p>}
      {action && <div className={styles.emptyAction}>{action}</div>}
    </div>
  );
}
