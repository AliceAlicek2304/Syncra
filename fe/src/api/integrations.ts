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

export interface ConnectResponse {
  url: string
}

export interface DisconnectResponse {
  message: string
  workspaceId: string
  providerId: string
}

export const integrationsApi = {
  list: (workspaceId: string) =>
    api.get<IntegrationDto[]>(`/workspaces/${workspaceId}/integrations`),

  connect: (workspaceId: string, providerId: string) =>
    api.post<ConnectResponse>(`/workspaces/${workspaceId}/integrations/${providerId}/connect`),

  disconnect: (workspaceId: string, providerId: string) =>
    api.delete<DisconnectResponse>(`/workspaces/${workspaceId}/integrations/${providerId}`),

  health: (workspaceId: string, providerId: string) =>
    api.get(`/workspaces/${workspaceId}/integrations/${providerId}/health`),
}
