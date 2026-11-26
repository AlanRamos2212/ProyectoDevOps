const api = import.meta.env.VITE_API_URL ?? '/api/v1';

export async function request<T>(token: string, path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${api}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers
    }
  });

  if (!response.ok) {
    const body = await response.json();
    throw new Error(body.error ?? 'Ocurrió un error');
  }

  if (response.status === 204) return null as T;
  return response.json();
}

export async function login(email: string, password: string): Promise<string> {
  const response = await fetch(`${api}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error ?? 'No se pudo iniciar sesión');
  return body.token;
}
