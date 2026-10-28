import { ExclamationTriangleIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';
import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { ApiError } from '../api/client';
import { useChangePassword, useLogout, useSession } from '../api/hooks';
import { Button, TextField } from '../components/ui';
import { AuthLayout, authStyles as styles } from './AuthLayout';

const MIN = 12;

export function ChangePasswordPage() {
  const session = useSession();
  const change = useChangePassword();
  const logout = useLogout();
  const navigate = useNavigate();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<{ current?: string; next?: string; confirm?: string }>({});
  const temporary = session.data?.user.mustChangePassword ?? false;

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
      onSuccess: () => navigate('/dashboard', { replace: true, state: { passwordChanged: true } }),
      onError: (error) => {
        if (error instanceof ApiError && error.code === 'invalid_current_password') setErrors({ current: error.message });
        else if (error instanceof ApiError && (error.code === 'weak_password' || error.code === 'password_reused')) setErrors({ next: error.message });
      },
    });
  }

  const generalError = change.error instanceof ApiError && !['invalid_current_password', 'weak_password', 'password_reused'].includes(change.error.code)
    ? change.error.message : null;

  return (
    <AuthLayout>
      <div className={styles.success} aria-hidden="true" style={{ margin: 0, background: 'var(--color-accent-soft)', color: 'var(--color-accent)' }}>
        <ShieldCheckIcon width={24} height={24} />
      </div>
      <h1 className={styles.title} style={{ marginTop: 'var(--space-5)' }}>{temporary ? 'Crea tu contraseña' : 'Cambiar contraseña'}</h1>
      <p className={styles.subtitle}>
        {temporary ? 'Tu cuenta usa una contraseña temporal. Elige una propia para continuar.' : 'Actualiza la contraseña de tu cuenta de Academic Hub.'}
      </p>
      <form className={styles.form} onSubmit={onSubmit} noValidate>
        {generalError && <div className={styles.alert} role="alert"><ExclamationTriangleIcon aria-hidden="true" />{generalError}</div>}
        <TextField label={temporary ? 'Contraseña temporal' : 'Contraseña actual'} type="password" autoComplete="current-password" revealable
          value={current} error={errors.current} onChange={(event) => setCurrent(event.target.value)} />
        <TextField label="Nueva contraseña" type="password" autoComplete="new-password" revealable
          hint={`Mínimo ${MIN} caracteres. Una frase de varias palabras es fácil de recordar y difícil de adivinar.`}
          value={next} error={errors.next} onChange={(event) => setNext(event.target.value)} />
        <TextField label="Confirma la nueva contraseña" type="password" autoComplete="new-password" revealable
          value={confirm} error={errors.confirm} onChange={(event) => setConfirm(event.target.value)} />
        <Button type="submit" block loading={change.isPending}>Guardar contraseña</Button>
        {temporary && (
          <Button type="button" variant="ghost" block onClick={() => logout.mutate(undefined, { onSettled: () => navigate('/login', { replace: true }) })}>
            Cerrar sesión
          </Button>
        )}
      </form>
    </AuthLayout>
  );
}
