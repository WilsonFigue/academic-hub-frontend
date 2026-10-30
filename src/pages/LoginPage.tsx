import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { useRef, useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { ApiError } from '../api/client';
import { useLogin, useSession } from '../api/hooks';
import { Button, TextField } from '../components/ui';
import { AuthLayout, authStyles as styles } from './AuthLayout';

function loginErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.code === 'invalid_credentials') return 'Usuario o contraseña incorrectos. Revisa los datos e inténtalo de nuevo.';
    if (error.code === 'rate_limited') return 'Demasiados intentos. Espera un minuto antes de volver a intentarlo.';
    return error.message;
  }
  return 'No pudimos iniciar sesión. Inténtalo de nuevo.';
}

export function LoginPage() {
  const session = useSession();
  const login = useLogin();
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ identifier?: string; password?: string }>({});
  const identifierRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  if (session.data?.user) return <Navigate to={session.data.user.mustChangePassword ? '/change-password' : '/dashboard'} replace />;

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const next: typeof errors = {};
    if (!identifier.trim()) next.identifier = 'Escribe tu correo o tu usuario de Academic Hub.';
    if (!password) next.password = 'Escribe tu contraseña.';
    setErrors(next);
    if (next.identifier) return identifierRef.current?.focus();
    if (next.password) return passwordRef.current?.focus();
    login.mutate({ identifier: identifier.trim(), password }, {
      onSuccess: (data) => navigate(data.user.mustChangePassword ? '/change-password' : '/dashboard', { replace: true }),
    });
  }

  return (
    <AuthLayout>
      <h1 className={styles.title}>Inicia sesión</h1>
      <p className={styles.subtitle}>Entra con tu cuenta de Academic Hub.</p>

      <form className={styles.form} onSubmit={onSubmit} noValidate>
        {login.error && (
          <div className={styles.alert} role="alert">
            <ExclamationTriangleIcon aria-hidden="true" />{loginErrorMessage(login.error)}
          </div>
        )}
        <TextField ref={identifierRef} label="Correo o usuario" name="username" autoComplete="username" inputMode="email"
          autoCapitalize="none" spellCheck={false} value={identifier} error={errors.identifier}
          onChange={(event) => setIdentifier(event.target.value)} />
        <TextField ref={passwordRef} label="Contraseña" name="password" type="password" autoComplete="current-password" revealable
          value={password} error={errors.password} onChange={(event) => setPassword(event.target.value)} />
        <Button type="submit" block loading={login.isPending}>{login.isPending ? 'Entrando…' : 'Iniciar sesión'}</Button>
      </form>

      <p className={styles.footnote}>Esta no es la contraseña de tu campus virtual. Academic Hub nunca te la pedirá aquí.</p>
    </AuthLayout>
  );
}
