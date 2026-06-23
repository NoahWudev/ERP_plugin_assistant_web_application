import type { AdminRole, AdminTeam, AdminUser } from '../types/admin';
import { apiFetch } from './api';

type ApiUser = {
  id: string;
  username: string;
  display_name: string;
  roles: string[];
  permissions: string[];
  team_ids: string[];
  is_active: boolean;
  phone?: string;
  email?: string;
};

type ApiRole = {
  code: string;
  name: string;
  permissions: string[];
};

type ApiTeam = {
  id: string;
  name: string;
  members: {
    user_id: string;
    username: string;
    display_name: string;
    role_in_team: 'lead' | 'assistant';
  }[];
};

function userFromApi(row: ApiUser): AdminUser {
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    roles: row.roles,
    permissions: row.permissions,
    teamIds: row.team_ids,
    isActive: row.is_active,
    phone: row.phone,
    email: row.email,
  };
}

function roleFromApi(row: ApiRole): AdminRole {
  return {
    code: row.code,
    name: row.name,
    permissions: row.permissions,
  };
}

function teamFromApi(row: ApiTeam): AdminTeam {
  return {
    id: row.id,
    name: row.name,
    members: row.members.map((m) => ({
      userId: m.user_id,
      username: m.username,
      displayName: m.display_name,
      roleInTeam: m.role_in_team,
    })),
  };
}

export async function fetchAdminUsers(): Promise<AdminUser[]> {
  const rows = await apiFetch<ApiUser[]>('/api/admin/users');
  return rows.map(userFromApi);
}

export async function fetchAdminRoles(): Promise<AdminRole[]> {
  const rows = await apiFetch<ApiRole[]>('/api/admin/roles');
  return rows.map(roleFromApi);
}

export async function createAdminUser(payload: {
  username: string;
  password: string;
  displayName: string;
  phone?: string;
  email?: string;
  roleCodes: string[];
}): Promise<AdminUser> {
  const row = await apiFetch<ApiUser>('/api/admin/users', {
    method: 'POST',
    body: JSON.stringify({
      username: payload.username,
      password: payload.password,
      display_name: payload.displayName,
      phone: payload.phone,
      email: payload.email,
      role_codes: payload.roleCodes,
    }),
  });
  return userFromApi(row);
}

export async function updateAdminUser(
  id: string,
  payload: {
    displayName?: string;
    phone?: string;
    email?: string;
    password?: string;
    roleCodes?: string[];
    isActive?: boolean;
  }
): Promise<AdminUser> {
  const row = await apiFetch<ApiUser>(`/api/admin/users/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({
      display_name: payload.displayName,
      phone: payload.phone,
      email: payload.email,
      password: payload.password,
      role_codes: payload.roleCodes,
      is_active: payload.isActive,
    }),
  });
  return userFromApi(row);
}

export async function fetchAdminTeams(): Promise<AdminTeam[]> {
  const rows = await apiFetch<ApiTeam[]>('/api/admin/teams');
  return rows.map(teamFromApi);
}

export async function createAdminTeam(name: string): Promise<AdminTeam> {
  const row = await apiFetch<{ id: string; name: string }>('/api/admin/teams', {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
  return { id: row.id, name: row.name, members: [] };
}

export async function addTeamMember(
  teamId: string,
  userId: string,
  roleInTeam: 'lead' | 'assistant'
): Promise<void> {
  await apiFetch(`/api/admin/teams/${teamId}/members`, {
    method: 'POST',
    body: JSON.stringify({ user_id: userId, role_in_team: roleInTeam }),
  });
}

export async function removeTeamMember(teamId: string, userId: string): Promise<void> {
  await apiFetch(`/api/admin/teams/${teamId}/members/${userId}`, { method: 'DELETE' });
}
