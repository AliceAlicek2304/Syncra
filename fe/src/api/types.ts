export interface User {
  userId: string;
  email: string;
  displayName?: string;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
  timezone?: string;
  locale?: string;
  hasPasswordBeenSet?: boolean;
  emailVerifiedAtUtc?: string | null;

}

export interface AuthResponse {
  token: string;
  refreshToken: string;
  expiresAtUtc: string;
  checkoutUrl?: string;
}

export interface LoginRequest {
  email: string;
  password?: string;
  flow?: string;
  plan?: string;
}

export interface RegisterRequest {
  email: string;
  password?: string;
  firstName: string;
  lastName: string;
  flow?: string;
  plan?: string;
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  role: string;
  zernioProfileId?: string;
  color?: string;
  description?: string;
}

export interface Profile {
  id: string;
  name: string;
  zernioProfileId: string;
  color?: string;
  avatarUrl?: string;
  isActive: boolean;
  createdAtUtc: string;
}

export interface WorkspaceResponse {
  workspaces: Workspace[];
}

export interface LinkAccountRequest {
  email: string;
  password?: string;
  provider: string;
  providerKey: string;
}

export interface LinkedAccount {
  provider: string;
  providerKey: string | null;
  linkedAtUtc: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}

export interface ForgotPasswordResponse {
  message: string;
}

// ── Pagination ──────────────────────────────────────────────────────────────

export interface Pagination {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export interface PagedResult<T> {
  items: T[];
  pagination: Pagination;
}
