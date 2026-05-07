import api from '../lib/axios';

export interface GeneratedIdea {
  id: string;
  title: string;
  hook: string;
  caption: string;
  type: string;      // e.g. "Reel", "Carousel", "Story"
  platforms: string[]; // e.g. ["TikTok", "Instagram"]
}

export interface AIGenerateRequest {
  topic: string;
  niche?: string;
  audience?: string;
  goal?: string;
  tone?: string;
  referenceAssetIds?: string[]; // R2 assetIds uploaded before generation (D-02)
}

export interface AIGenerateResponse {
  ideas: GeneratedIdea[];
  cooldownSeconds?: number; // rate limiting (D-04)
}

export const aiApi = {
  generateIdeas: async (
    workspaceId: string,
    data: AIGenerateRequest
  ): Promise<AIGenerateResponse> => {
    const response = await api.post<AIGenerateResponse>(
      `workspaces/${workspaceId}/ai/ideas/generate`,
      data
    );
    return response.data;
  },
};
