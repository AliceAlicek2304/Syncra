export interface User {
  userId: string;
  email: string;
  displayName?: string;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
  timezone?: string;
  locale?: string;
}

export interface AuthResponse {
  token: string;
  refreshToken: string;
  expiresAtUtc: string;
}

export interface LoginRequest {
  email: string;
  password?: string;
}

export interface RegisterRequest {
  email: string;
  password?: string;
  firstName: string;
  lastName: string;
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  role: string;
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
