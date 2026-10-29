import { Check, CircleCheck, KeyRound, ShieldCheck, TriangleAlert, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ApiError } from '../api/client';
import { useChangePassword } from '../api/hooks';
import { useReducedMotion } from '../lib/motion';
import { Button, TextField } from './ui';
import styles from './ChangePasswordModal.module.css';

const ease = [0.22, 1, 0.36, 1] as const;
const MIN = 12;
const cx = (...names: Array<string | false | null | undefined>) => names.filter(Boolean).join(' ');

/** Orientación sobre la fortaleza (el servidor es quien valida): largo y variedad de caracteres. */
function strength(value: string): { level: 0 | 1 | 2 | 3 | 4; label: string } {
  if (!value) return { level: 0, label: 'Escribe una contraseña' };
  if (value.length < MIN) return { level: 1, label: 'Muy corta' };
  const classes = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((re) => re.test(value)).length;
  const score = (value.length >= 16 ? 1 : 0) + (value.length >= 20 ? 1 : 0) + (classes >= 3 ? 1 : 0);
  if (score >= 3) return { level: 4, label: 'Muy buena' };
  if (score === 2) return { level: 3, label: 'Buena' };
  return { level: 2, label: 'Aceptable' };
}
const LEVEL_COLOR = ['var(--border)', 'var(--bad)', 'var(--warn)', 'var(--sky)', 'var(--ok)'] as const;

/** Cambio de contraseña en una ventana: reglas en vivo, medidor de fortaleza y confirmación al terminar. */
export function ChangePasswordModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const reduce = useReducedMotion();
  const change = useChangePassword();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<{ current?: string; next?: string; confirm?: string }>({});
  const [done, setDone] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  const busy = change.isPending;

  useEffect(() => {
    if (!open) return;
    setCurrent(''); setNext(''); setConfirm(''); setErrors({}); setDone(false); change.reset();
    const timer = window.setTimeout(() => panel.current?.querySelector<HTMLInputElement>('input')?.focus(), 120);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape' && !busy) onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, busy, onClose]);

  useEffect(() => {
    if (!done) return;
    const timer = window.setTimeout(onClose, 2600);
    return () => window.clearTimeout(timer);
  }, [done, onClose]);

  const power = strength(next);
  const rules = [
    { ok: next.length >= MIN, text: `Al menos ${MIN} caracteres` },
    { ok: next.length > 0 && next !== current, text: 'Distinta de la actual' },
    { ok: confirm.length > 0 && confirm === next, text: 'Las dos coinciden' },
  ];

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const found: typeof errors = {};
    if (!current) found.current = 'Escribe tu contraseña actual.';
    if (next.length < MIN) found.next = `Usa al menos ${MIN} caracteres.`;
    else if (next === current) found.next = 'La nueva contraseña debe ser distinta de la actual.';
    if (confirm !== next) found.confirm = 'Las contraseñas no coinciden.';
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    change.mutate({ currentPassword: current, newPassword: next }, {
      onSuccess: () => { setCurrent(''); setNext(''); setConfirm(''); setDone(true); },
      onError: (error) => {
        if (error instanceof ApiError && error.code === 'invalid_current_password') setErrors({ current: error.message });
        else if (error instanceof ApiError && (error.code === 'weak_password' || error.code === 'password_reused')) setErrors({ next: error.message });
      },
    });
  }

  const generalError = change.error instanceof ApiError && !['invalid_current_password', 'weak_password', 'password_reused'].includes(change.error.code) ? change.error.message : null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div className={styles.overlay} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.15 } }}
          onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onClose(); }}>
          <motion.div ref={panel} className={styles.panel} role="dialog" aria-modal="true" aria-labelledby="pw-title"
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 28, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={reduce ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.97, transition: { duration: 0.16 } }}
            transition={{ type: 'spring', stiffness: 380, damping: 32 }}>
            <button type="button" className={styles.close} onClick={onClose} disabled={busy} aria-label="Cerrar"><X size={19} aria-hidden="true" /></button>

            <AnimatePresence mode="wait" initial={false}>
              {done ? (
                <motion.div key="done" className={styles.done} initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.35, ease }}>
                  <motion.span className={styles.doneIcon} initial={{ scale: 0.3, rotate: -30 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 360, damping: 16 }}><CircleCheck size={44} aria-hidden="true" /></motion.span>
                  <h2 id="pw-title">Contraseña actualizada</h2>
                  <p>Tu cuenta de Academic Hub ya usa la nueva contraseña. La del campus virtual no se toca.</p>
                  <Button onClick={onClose}>Listo</Button>
                </motion.div>
              ) : (
                <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.1 } }}>
                  <header className={styles.head}>
                    <span className={styles.icon}><KeyRound size={24} aria-hidden="true" /></span>
                    <div><h2 id="pw-title">Cambiar contraseña</h2><p>Actualiza la contraseña de tu cuenta de Academic Hub.</p></div>
                  </header>
                  <form className={styles.form} onSubmit={onSubmit} noValidate>
                    {generalError && <div className={styles.alert} role="alert"><TriangleAlert size={18} aria-hidden="true" />{generalError}</div>}
                    <TextField label="Contraseña actual" type="password" autoComplete="current-password" revealable value={current} error={errors.current} onChange={(e) => setCurrent(e.target.value)} />
                    <TextField label="Nueva contraseña" type="password" autoComplete="new-password" revealable value={next} error={errors.next} onChange={(e) => setNext(e.target.value)} />
                    <div className={styles.meter} aria-live="polite">
                      <div className={styles.bars} aria-hidden="true">
                        {[1, 2, 3, 4].map((i) => <i key={i} style={{ background: power.level >= i ? LEVEL_COLOR[power.level] : undefined }} />)}
                      </div>
                      <span style={{ color: power.level ? LEVEL_COLOR[power.level] : undefined }}>{power.label}</span>
                    </div>
                    <TextField label="Confirma la nueva contraseña" type="password" autoComplete="new-password" revealable value={confirm} error={errors.confirm} onChange={(e) => setConfirm(e.target.value)} />
                    <ul className={styles.rules} aria-label="Requisitos">
                      {rules.map((rule) => (
                        <li key={rule.text} className={cx(rule.ok && styles.ruleOk)}><span aria-hidden="true">{rule.ok ? <Check size={13} /> : null}</span>{rule.text}</li>
                      ))}
                    </ul>
                    <p className={styles.tip}><ShieldCheck size={15} aria-hidden="true" />Una frase de varias palabras es fácil de recordar y difícil de adivinar.</p>
                    <div className={styles.actions}>
                      <Button type="button" variant="ghost" onClick={onClose} disabled={busy}>Cancelar</Button>
                      <Button type="submit" loading={busy}>Guardar contraseña</Button>
                    </div>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
