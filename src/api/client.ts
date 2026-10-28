// Cliente HTTP único. Mismo origen vía proxy de Vite: la cookie de sesión es HttpOnly y nunca se lee aquí;
// solo se lee la cookie CSRF (no sensible por sí sola) para reenviarla en la cabecera.

export class ApiError extends Error {
  constructor(readonly status: number, readonly code: string, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

function csrfToken(): string | null {
  const match = document.cookie.split('; ').find((part) => part.startsWith('ah_csrf='));
  return match ? decodeURIComponent(match.slice('ah_csrf='.length)) : null;
}

type Listener = (error: ApiError) => void;
const authListeners = new Set<Listener>();

/** Notifica sesiones expiradas o cambio de contraseña obligatorio a la capa de rutas. */
export function onAuthProblem(listener: Listener): () => void {
  authListeners.add(listener);
  return () => authListeners.delete(listener);
}

export async function api<T>(path: string, options: { method?: 'GET' | 'POST' | 'PATCH' | 'PUT'; body?: unknown; silentAuth?: boolean } = {}): Promise<T> {
  const method = options.method ?? 'GET';
  const headers: Record<string, string> = { accept: 'application/json' };
  if (options.body !== undefined) headers['content-type'] = 'application/json';
  if (method !== 'GET') {
    const token = csrfToken();
    if (token) headers['x-csrf-token'] = token;
  }

  let response: Response;
  try {
    response = await fetch(`/api/v1${path}`, {
      method,
      headers,
      credentials: 'same-origin',
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });
  } catch {
    throw new ApiError(0, 'network_error', 'No pudimos conectar con Academic Hub. Revisa tu conexión e inténtalo de nuevo.');
  }

  if (response.status === 204) return undefined as T;
  const payload = (await response.json().catch(() => null)) as { error?: { code?: string; message?: string } } | null;
  if (!response.ok) {
    const error = new ApiError(
      response.status,
      payload?.error?.code ?? 'unknown_error',
      payload?.error?.message ?? 'Ocurrió un error inesperado.',
    );
    if (!options.silentAuth && (error.status === 401 || error.code === 'password_change_required')) {
      for (const listener of authListeners) listener(error);
    }
    throw error;
  }
  return payload as T;
}
