import type { AuthUser } from '../types/auth';

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

type ApiUser = {
  id: string;
  username: string;
  display_name: string;
  roles: string[];
  permissions: string[];
  team_ids: string[];
};

function mapUser(data: ApiUser): AuthUser {
  return {
    id: data.id,
    username: data.username,
    displayName: data.display_name,
    roles: data.roles,
    permissions: data.permissions,
    teamIds: data.team_ids,
  };
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(path, {
    ...init,
    headers,
    credentials: 'include',
  });

  if (!response.ok) {
    let message = response.statusText;
    try {
      const payload = await response.json();
      if (typeof payload.detail === 'string') {
        message = payload.detail;
      }
    } catch {
      // ignore
    }
    throw new ApiError(response.status, message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export async function loginRequest(username: string, password: string): Promise<AuthUser> {
  const data = await apiFetch<ApiUser>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
  return mapUser(data);
}

export async function logoutRequest(): Promise<void> {
  await apiFetch('/api/auth/logout', { method: 'POST' });
}

export async function meRequest(): Promise<AuthUser> {
  const data = await apiFetch<ApiUser>('/api/auth/me');
  return mapUser(data);
}
