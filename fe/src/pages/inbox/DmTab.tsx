import { useState, useCallback, useMemo } from 'react';
import { useInbox } from '../../hooks/useInbox';
import ConversationList from './components/ConversationList';
import ChatArea from './components/ChatArea';
import type { Conversation, Message, InboxFilters } from './types';

interface DmTabProps {
  workspaceId?: string;
  filters: InboxFilters;
}

export default function DmTab({ workspaceId, filters }: DmTabProps) {
  const {
    conversations,
    markConversationRead,
    sendDmReply,
  } = useInbox({ 
    workspaceId, 
    platform: filters.platform || undefined, 
    accountId: filters.accountId || undefined 
  });

  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);

  // Map API DTOs to our new Front-end Domain Models
  const mappedConversations: Conversation[] = useMemo(() => {
    const apiConvs = conversations.data?.pages.flatMap((p) => p.items) ?? [];
    let list = apiConvs.map(apiConv => ({
      id: apiConv.id,
      platform: apiConv.platform,
      accountId: apiConv.socialAccountId ?? '',
      customerName: apiConv.participantName ?? '',
      customerAvatar: apiConv.participantAvatarUrl ?? '',
      lastMessage: apiConv.lastMessageText ?? '',
      updatedAt: apiConv.lastMessageAtUtc ?? apiConv.createdAtUtc,
      isRead: apiConv.isRead,
      status: 'open' as const, // Mocked as API doesn't have status yet
    }));

    if (filters.status === 'unread') {
      list = list.filter(c => !c.isRead);
    }

    if (filters.search?.trim()) {
      const q = filters.search.toLowerCase();
      list = list.filter(
        (c) =>
          c.customerName?.toLowerCase().includes(q) ||
          c.lastMessage?.toLowerCase().includes(q)
      );
    }
    
    // Assignee mock filter
    if (filters.assigneeId === 'me') {
       // list = list.filter(...) // mock logic
    }

    return list;
  }, [conversations.data, filters]);

  const handleSelectConversation = useCallback(
    async (conv: Conversation) => {
      setSelectedConv(conv);

      if (!conv.isRead) {
        void markConversationRead(conv.id);
      }

      if (!workspaceId) return;
      setMessagesLoading(true);
      try {
        const { inboxApi } = await import('../../api/inbox');
        const apiMsgs = await inboxApi.getConversationMessages(workspaceId, conv.id);
        
        // Map to front-end Message domain model
        const mappedMsgs = apiMsgs.map(m => ({
          id: m.id,
          conversationId: m.inboxConversationId,
          senderId: m.zernioAccountId || 'customer',
          senderType: (m.direction === 'outgoing' ? 'admin' : 'customer') as 'admin' | 'customer',
          content: m.bodyText || '',
          mediaUrl: m.attachments?.[0]?.url,
          createdAt: m.sentAtUtc,
          status: (m.direction === 'outgoing' ? 'sent' : 'read') as 'sent' | 'read',
        }));
        setMessages(mappedMsgs);
      } catch {
        setMessages([]);
      } finally {
        setMessagesLoading(false);
      }
    },
    [workspaceId, markConversationRead],
  );

  const handleSend = useCallback(
    async (text: string, _attachments?: any[]) => {
      if (!selectedConv || !workspaceId) return;

      // Optimistic update
      const newMsg: Message = {
        id: Math.random().toString(),
        conversationId: selectedConv.id,
        senderId: 'me',
        senderType: 'admin',
        content: text,
        createdAt: new Date().toISOString(),
        status: 'sending'
      };
      setMessages(prev => [...prev, newMsg]);

      await sendDmReply({ conversationId: selectedConv.id, text, accountId: selectedConv.accountId });

      const { inboxApi } = await import('../../api/inbox');
      const apiMsgs = await inboxApi.getConversationMessages(workspaceId, selectedConv.id);
      
      const mappedMsgs = apiMsgs.map(m => ({
        id: m.id,
        conversationId: m.inboxConversationId,
        senderId: m.zernioAccountId || 'customer',
        senderType: (m.direction === 'outgoing' ? 'admin' : 'customer') as 'admin' | 'customer',
        content: m.bodyText || '',
        mediaUrl: m.attachments?.[0]?.url,
        createdAt: m.sentAtUtc,
        status: (m.direction === 'outgoing' ? 'sent' : 'read') as 'sent' | 'read',
      }));
      setMessages(mappedMsgs);
    },
    [selectedConv, workspaceId, sendDmReply],
  );

  const handleBack = useCallback(() => {
    setSelectedConv(null);
    setMessages([]);
  }, []);

  return (
    <>
      <ConversationList 
        conversations={mappedConversations}
        selectedId={selectedConv?.id || null}
        onSelect={handleSelectConversation}
        isLoading={conversations.isLoading}
      />
      <ChatArea 
        conversation={selectedConv}
        messages={messages}
        isLoading={messagesLoading}
        onSend={handleSend}
        onBack={handleBack}
        onResolve={() => console.log('resolve')}
        onMute={() => console.log('mute')}
      />
    </>
  );
}
