export interface Conversation {
  id: string;
  platform: 'facebook' | 'tiktok' | 'instagram' | 'twitter' | 'bluesky' | 'reddit' | 'telegram' | 'whatsapp' | string;
  accountId: string;
  customerName: string;
  customerAvatar: string;
  lastMessage: string;
  updatedAt: string;
  isRead: boolean;
  status: 'open' | 'resolved';
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderType: 'customer' | 'admin';
  content: string;
  mediaUrl?: string;
  createdAt: string;
  status: 'sending' | 'sent' | 'failed' | 'read';
}

export interface InboxFilters {
  platform: string | null;
  status: 'open' | 'resolved' | 'unread' | 'all' | null;
  search: string;
  accountId?: string | null;
  assigneeId?: string | null;
}
