import api from '../lib/axios';
import type { PagedResult } from './types';

export interface NotificationItem {
  id: string;
  workspaceId: string;
  userId?: string;
  type: string;
  title: string;
  body: string;
  payloadJson?: string;
  createdAtUtc: string;
  readAtUtc?: string;
}

export interface NotificationListParams {
  unreadOnly?: boolean;
  page?: number;
  pageSize?: number;
}

export const notificationsApi = {
  listNotifications: async (
    workspaceId: string,
    params?: NotificationListParams
  ): Promise<PagedResult<NotificationItem>> => {
    const response = await api.get<PagedResult<NotificationItem>>(`workspaces/${workspaceId}/notifications`, {
      params,
    });

    return response.data;
  },

  markRead: async (workspaceId: string, notificationId: string): Promise<void> => {
    await api.post(`workspaces/${workspaceId}/notifications/${notificationId}/read`);
  },

  markAllRead: async (workspaceId: string): Promise<void> => {
    await api.post(`workspaces/${workspaceId}/notifications/read-all`);
  },
};
