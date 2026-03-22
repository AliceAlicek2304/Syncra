import { useState, useCallback, useEffect } from 'react'
import { integrationsApi, type IntegrationDto } from '../api/integrations'
import { useWorkspace } from '../context/WorkspaceContext'

export function useIntegrations() {
  const { activeWorkspace } = useWorkspace()
  const [integrations, setIntegrations] = useState<IntegrationDto[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isConnecting, setIsConnecting] = useState<string | null>(null)
  const [isDisconnecting, setIsDisconnecting] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const fetchIntegrations = useCallback(async () => {
    if (!activeWorkspace) return
    setIsLoading(true)
    setError(null)
    try {
      const res = await integrationsApi.list(activeWorkspace.id)
      setIntegrations(res.data)
    } catch {
      setError('Failed to load integrations')
    } finally {
      setIsLoading(false)
    }
  }, [activeWorkspace])

  useEffect(() => {
    fetchIntegrations()
  }, [fetchIntegrations])

  const connect = useCallback(async (providerId: string) => {
    if (!activeWorkspace) return
    setIsConnecting(providerId)
    setError(null)
    try {
      const res = await integrationsApi.connect(activeWorkspace.id, providerId)
      window.location.href = res.data.url
    } catch {
      setError('Failed to start connection. Please try again.')
      setIsConnecting(null)
    }
  }, [activeWorkspace])

  const disconnect = useCallback(async (providerId: string) => {
    if (!activeWorkspace) return
    setIsDisconnecting(providerId)
    setError(null)
    try {
      await integrationsApi.disconnect(activeWorkspace.id, providerId)
      await fetchIntegrations()
    } catch {
      setError('Failed to disconnect. Please try again.')
    } finally {
      setIsDisconnecting(null)
    }
  }, [activeWorkspace, fetchIntegrations])

  const getIntegration = useCallback((providerId: string) => {
    return integrations.find(i => i.platform.toLowerCase() === providerId.toLowerCase())
  }, [integrations])

  const getIntegrationStatus = useCallback((providerId: string) => {
    const integration = getIntegration(providerId)
    if (!integration) return 'disconnected'
    if (!integration.isActive) return 'disconnected'
    const health = integration.tokenRefreshHealthStatus
    if (health === 'Healthy') return 'connected'
    if (health === 'NeedsRefresh' || health === 'Failed') return 'expired'
    return 'connected'
  }, [getIntegration])

  return {
    integrations,
    isLoading,
    isConnecting,
    isDisconnecting,
    error,
    connect,
    disconnect,
    getIntegration,
    getIntegrationStatus,
    refetch: fetchIntegrations,
  }
}
