import { api } from './axios'

export interface IntegrationDto {
  id: string
  workspaceId: string
  platform: string
  externalAccountId: string | null
  isActive: boolean
  expiresAtUtc: string | null
  tokenRefreshLastSuccessAtUtc: string | null
  tokenRefreshHealthStatus: string | null
  metadata: Record<string, string> | null
}

export interface IntegrationPageDto {
  pageId: string
  pageName: string | null
  category: string | null
  isActive: boolean
}

export interface ConnectResponse {
  url: string
}

export interface DisconnectResponse {
  message: string
  workspaceId: string
  providerId?: string
  integrationId?: string
}

export interface ConnectOptions {
  entityType?: 'page' | 'group'
  frontendRedirectUri?: string
}

export const integrationsApi = {
  list: (workspaceId: string) =>
    api.get<IntegrationDto[]>(`/workspaces/${workspaceId}/integrations`),

  listByProvider: (workspaceId: string, providerId: string) =>
    api.get<IntegrationDto[]>(`/workspaces/${workspaceId}/integrations/${providerId}/connections`),

  connect: (workspaceId: string, providerId: string, options?: ConnectOptions) =>
    api.post<ConnectResponse>(
      `/workspaces/${workspaceId}/integrations/${providerId}/connect`,
      null,
      { params: options }
    ),

  disconnect: (workspaceId: string, providerId: string) =>
    api.delete<DisconnectResponse>(`/workspaces/${workspaceId}/integrations/${providerId}`),

  disconnectById: (workspaceId: string, integrationId: string) =>
    api.delete<DisconnectResponse>(`/workspaces/${workspaceId}/integrations/${integrationId}`),

  health: (workspaceId: string, providerId: string) =>
    api.get(`/workspaces/${workspaceId}/integrations/${providerId}/health`),

  healthById: (workspaceId: string, integrationId: string) =>
    api.get(`/workspaces/${workspaceId}/integrations/${integrationId}/health`),

  pages: (workspaceId: string, integrationId: string) =>
    api.get<IntegrationPageDto[]>(`/workspaces/${workspaceId}/integrations/${integrationId}/pages`),

  setActivePage: (workspaceId: string, integrationId: string, pageId: string) =>
    api.put(`/workspaces/${workspaceId}/integrations/${integrationId}/pages/active`, { pageId }),
}
