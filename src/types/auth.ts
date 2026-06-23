export interface AuthUser {
  id: string;
  username: string;
  displayName: string;
  roles: string[];
  permissions: string[];
  teamIds: string[];
}

export interface LoginCredentials {
  username: string;
  password: string;
}
