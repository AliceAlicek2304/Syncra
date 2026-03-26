import { api } from '../api/axios'

export interface GenerateRepurposeRequest {
  sourceText: string
  platforms: string[]
  tone?: string
  length?: string
  extractAtoms?: boolean
}

export const generateRepurpose = (workspaceId: string, req: GenerateRepurposeRequest) => {
  return api.post(`/workspaces/${workspaceId}/ai/repurpose/generate`, req)
}

export default { generateRepurpose }
