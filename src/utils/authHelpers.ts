import type { AuthUser } from '../types/auth';

export function isAdmin(user: AuthUser | null | undefined): boolean {
  return Boolean(user?.roles.includes('admin'));
}

export function hasPermission(user: AuthUser | null | undefined, code: string): boolean {
  if (!user) return false;
  if (isAdmin(user)) return true;
  return user.permissions.includes(code);
}
