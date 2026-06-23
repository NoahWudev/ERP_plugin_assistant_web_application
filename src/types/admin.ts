export interface AdminUser {
  id: string;
  username: string;
  displayName: string;
  roles: string[];
  permissions: string[];
  teamIds: string[];
  isActive: boolean;
  phone?: string;
  email?: string;
}

export interface AdminRole {
  code: string;
  name: string;
  permissions: string[];
}

export interface TeamMemberInfo {
  userId: string;
  username: string;
  displayName: string;
  roleInTeam: 'lead' | 'assistant';
}

export interface AdminTeam {
  id: string;
  name: string;
  members: TeamMemberInfo[];
}

export const ROLE_LABELS: Record<string, string> = {
  sales: '業務',
  sales_assistant: '業務助理',
  procurement: '採購',
  finance: '財務',
  engineering: '工程部',
  admin: '管理員',
};
