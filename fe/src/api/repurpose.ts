import api from '../lib/axios'

export interface RepurposeAtomDto {
  id: string
  type: string
  title?: string
  content: string
  platform: string
  suggestedHashtags: string[]
  suggestedCta?: string
  mediaUrl?: string
  mediaType?: string | null
}

export interface RepurposeResultDto {
  atoms: RepurposeAtomDto[]
}

export interface RepurposeSessionSummaryDto {
  id: string
  sourceText: string
  targetPlatforms: string
  tone: string
  status: string
  language: string
  contentLength: string
  extractAtoms: boolean
  createdAtUtc: string
  supportingSourcesJson?: string
}

export interface SupportingSourceRequest {
  id: string
  type: 'url' | 'file'
  label: string
  url?: string
  fileName?: string
}

export interface RepurposeGenerateRequest {
  sourceText?: string
  platforms: string[]
  tone: string
  contentLength?: string
  extractAtoms: boolean
  language?: string
  supportingSources?: SupportingSourceRequest[]
  selectedPostIds?: string[]
  generateMedia?: boolean
  mediaType?: string | null
}

export interface SseEvent {
  type: 'token' | 'partial_json' | 'platform_complete' | 'complete' | 'error' | 'metadata'
  data: unknown
}

export interface FetchUrlResponse {
  title: string
  content: string
}

export const repurposeApi = {
  fetchUrl: async (workspaceId: string, url: string): Promise<FetchUrlResponse> => {
    const response = await api.post<FetchUrlResponse>(
      `workspaces/${workspaceId}/repurpose/fetch-url`,
      { url },
      { headers: { 'X-Workspace-Id': workspaceId } },
    )
    return response.data
  },
  generate: async (workspaceId: string, request: RepurposeGenerateRequest): Promise<RepurposeResultDto> => {
    const response = await api.post<RepurposeResultDto>(
      `workspaces/${workspaceId}/repurpose/generate`,
      request,
      { headers: { 'X-Workspace-Id': workspaceId } },
    )
    return response.data
  },

  generateStream: async (
    workspaceId: string,
    request: RepurposeGenerateRequest,
    signal: AbortSignal,
    onEvent?: (event: SseEvent) => void,
  ): Promise<RepurposeAtomDto[] | null> => {
    const token = localStorage.getItem('syncra_access_token')
    const workspaceHeader = localStorage.getItem('syncra_workspace_id') || workspaceId

    const response = await fetch(
      `${api.defaults.baseURL}/workspaces/${workspaceId}/repurpose/generate`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          'X-Workspace-Id': workspaceHeader,
        },
        body: JSON.stringify(request),
        signal,
      },
    )

    if (!response.ok) {
      const errorBody = await response.text().catch(() => '')
      const err = new Error(`HTTP ${response.status}: ${errorBody}`) as Error & { response?: { status?: number } }
      err.response = { status: response.status }
      throw err
    }

    const reader = response.body?.getReader()
    if (!reader) throw new Error('No response body')

    const decoder = new TextDecoder()
    let buffer = ''
    let allAtoms: RepurposeAtomDto[] | null = null

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''

      let currentEvent = ''

      for (const line of lines) {
        if (line.startsWith('event: ')) {
          currentEvent = line.slice(7).trim()
        } else if (line.startsWith('data: ')) {
          const dataStr = line.slice(6)
          try {
            const data = JSON.parse(dataStr) as Record<string, unknown>
            const event: SseEvent = { type: currentEvent as SseEvent['type'], data }
            onEvent?.(event)

            if (currentEvent === 'complete') {
              allAtoms = (data as { atoms: RepurposeAtomDto[] }).atoms
            }
          } catch {
            // skip unparseable data
          }
        }
      }
    }

    return allAtoms
  },

  getSession: async (workspaceId: string, sessionId: string): Promise<RepurposeResultDto> => {
    const response = await api.get<RepurposeResultDto>(
      `workspaces/${workspaceId}/repurpose/${sessionId}`,
      { headers: { 'X-Workspace-Id': workspaceId } },
    )
    return response.data
  },

  deleteSession: async (workspaceId: string, sessionId: string): Promise<void> => {
    await api.delete(
      `workspaces/${workspaceId}/repurpose/${sessionId}`,
      { headers: { 'X-Workspace-Id': workspaceId } },
    )
  },

  listSessions: async (workspaceId: string): Promise<RepurposeSessionSummaryDto[]> => {
    const response = await api.get<{ sessions: RepurposeSessionSummaryDto[] }>(
      `workspaces/${workspaceId}/repurpose`,
      { headers: { 'X-Workspace-Id': workspaceId } },
    )
    return response.data.sessions
  },
}
