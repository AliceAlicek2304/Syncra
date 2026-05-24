import api from '../lib/axios'

export interface TrendingTopicDto {
  id: string
  topic: string
  growth: string
  category: string
  volume: string
  sentiment: string
}

export interface PopularHashtagDto {
  tag: string
  growth: string
  color: string
}

export interface TrendsResultDto {
  trendingTopics: TrendingTopicDto[]
  popularHashtags: PopularHashtagDto[]
  tip: string
}

export const trendsApi = {
  /**
   * Get trending topics and hashtags for the workspace.
   */
  getTrends: async (workspaceId: string): Promise<TrendsResultDto> => {
    const response = await api.get<TrendsResultDto>(
      `workspaces/${workspaceId}/trends`,
    )
    return response.data
  },
}
