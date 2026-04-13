import { useState, useCallback, useEffect } from 'react'
import { integrationsApi, type IntegrationDto } from '../api/integrations'
import { useWorkspace } from '../context/WorkspaceContext'

type IntegrationPage = {
  pageId: string
  pageName: string | null
  category: string | null
  isActive: boolean
}

export function useIntegrations() {
  const { activeWorkspace } = useWorkspace()
  const [integrations, setIntegrations] = useState<IntegrationDto[]>([])
  const [pagesByIntegration, setPagesByIntegration] = useState<Record<string, IntegrationPage[]>>({})
  const [isLoadingPages, setIsLoadingPages] = useState<Record<string, boolean>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [isConnecting, setIsConnecting] = useState<string | null>(null)
  const [isDisconnecting, setIsDisconnecting] = useState<string | null>(null)
  const [isUpdatingPage, setIsUpdatingPage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const fetchIntegrations = useCallback(async () => {
    if (!activeWorkspace) return
    setIsLoading(true)
    setError(null)
    try {
      const res = await integrationsApi.list(activeWorkspace.id)
      setIntegrations(res.data)
      setPagesByIntegration({})
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
      const frontendRedirectUri = `${window.location.origin}/Syncra/app/settings`
      const res = await integrationsApi.connect(activeWorkspace.id, providerId, { frontendRedirectUri })
      return res
    } catch (err) {
      setError('Failed to start connection. Please try again.')
      setIsConnecting(null)
      throw err
    }
  }, [activeWorkspace])

  const disconnect = useCallback(async (providerId: string) => {
    if (!activeWorkspace) return
    setIsDisconnecting(`provider:${providerId}`)
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

  const disconnectById = useCallback(async (integrationId: string) => {
    if (!activeWorkspace) return
    setIsDisconnecting(`integration:${integrationId}`)
    setError(null)
    try {
      await integrationsApi.disconnectById(activeWorkspace.id, integrationId)
      await fetchIntegrations()
    } catch {
      setError('Failed to disconnect. Please try again.')
    } finally {
      setIsDisconnecting(null)
    }
  }, [activeWorkspace, fetchIntegrations])

  const getIntegrations = useCallback((providerId: string) => {
    return integrations.filter(i => i.platform.toLowerCase() === providerId.toLowerCase())
  }, [integrations])

  const getPagesForIntegration = useCallback((integrationId: string): IntegrationPage[] => {
    const cached = pagesByIntegration[integrationId]
    if (cached) return cached

    const integration = integrations.find(i => i.id === integrationId)
    if (!integration?.metadata) return []

    const pagesJson = integration.metadata['pagesJson']
    if (!pagesJson) {
      const pageId = integration.metadata['pageId']
      if (!pageId) return []

      return [{
        pageId,
        pageName: integration.metadata['pageName'] ?? null,
        category: integration.metadata['pageCategory'] ?? null,
        isActive: true,
      }]
    }

    try {
      const rawPages = JSON.parse(pagesJson) as Array<{
        id?: string
        name?: string | null
        accessToken?: string | null
        category?: string | null
      }>

      const activePageId = integration.metadata['pageId']

      return rawPages
        .filter(p => !!p.id)
        .map(p => ({
          pageId: p.id as string,
          pageName: p.name ?? null,
          category: p.category ?? null,
          isActive: p.id === activePageId,
        }))
    } catch {
      return []
    }
  }, [integrations, pagesByIntegration])

  const loadPagesForIntegration = useCallback(async (integrationId: string) => {
    if (!activeWorkspace) return

    setIsLoadingPages(prev => ({ ...prev, [integrationId]: true }))
    try {
      const res = await integrationsApi.pages(activeWorkspace.id, integrationId)
      setPagesByIntegration(prev => ({ ...prev, [integrationId]: res.data }))
    } catch {
      // Fallback to metadata parsing in UI if the pages endpoint fails.
    } finally {
      setIsLoadingPages(prev => ({ ...prev, [integrationId]: false }))
    }
  }, [activeWorkspace])

  const setActivePage = useCallback(async (integrationId: string, pageId: string) => {
    if (!activeWorkspace) return
    setIsUpdatingPage(`${integrationId}:${pageId}`)
    setError(null)
    try {
      await integrationsApi.setActivePage(activeWorkspace.id, integrationId, pageId)
      await fetchIntegrations()
      await loadPagesForIntegration(integrationId)
    } catch {
      setError('Failed to switch active page. Please try again.')
      throw new Error('set_active_page_failed')
    } finally {
      setIsUpdatingPage(null)
    }
  }, [activeWorkspace, fetchIntegrations, loadPagesForIntegration])

  const getIntegration = useCallback((providerId: string) => {
    const providerIntegrations = getIntegrations(providerId)
    return providerIntegrations.find(i => i.isActive) ?? providerIntegrations[0]
  }, [getIntegrations])

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
    isUpdatingPage,
    error,
    connect,
    disconnect,
    disconnectById,
    setActivePage,
    getIntegrations,
    getPagesForIntegration,
    loadPagesForIntegration,
    isLoadingPages,
    getIntegration,
    getIntegrationStatus,
    refetch: fetchIntegrations,
  }
}
