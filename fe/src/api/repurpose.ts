import api from '../lib/axios'

export interface RepurposeAtomDto {
  id: string
  type: string
  title?: string
  content: string
  platform: string
  suggestedHashtags: string[]
  suggestedCta?: string
}

export interface RepurposeResultDto {
  atoms: RepurposeAtomDto[]
}

export interface RepurposeGenerateRequest {
  sourceText: string
  platforms: string[]
  tone: string
  extractAtoms: boolean
}

export const repurposeApi = {
  /**
   * Generate repurposed content from source text for specified platforms.
   */
  generate: async (workspaceId: string, request: RepurposeGenerateRequest): Promise<RepurposeResultDto> => {
    const response = await api.post<RepurposeResultDto>(
      `workspaces/${workspaceId}/repurpose/generate`,
      request,
    )
    return response.data
  },
}
