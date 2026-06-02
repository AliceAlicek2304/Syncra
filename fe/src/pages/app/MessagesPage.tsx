import { useState, useRef, useEffect } from 'react'
import {
  Search, SlidersHorizontal, Phone, Video, MoreVertical,
  PlusCircle, Smile, Send, CheckCircle2, MessageSquare
} from 'lucide-react'
import styles from './MessagesPage.module.css'

interface Message {
  id: string
  sender: 'user' | 'me'
  text: string
  time: string
  status?: 'sent' | 'read'
}

interface Conversation {
  id: string
  name: string
  avatar: string
  online: boolean
  lastMsgTime: string
  lastMsgText: string
  unread: boolean
  platform: 'facebook' | 'instagram' | 'tiktok'
  workspace: 'general' | 'support'
  account: 'main_store' | 'branch_a'
  messages: Message[]
}

const INITIAL_CONVERSATIONS: Conversation[] = [
  {
    id: 'c1',
    name: 'Minh Anh',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=120',
    online: true,
    lastMsgTime: '12:45 PM',
    lastMsgText: "Sure, I've received the info. Could you please send...",
    unread: false,
    platform: 'facebook',
    workspace: 'general',
    account: 'main_store',
    messages: [
      { id: 'm1', sender: 'user', text: "Hi there, I'm interested in the Social Premium package. Could you please advise me on this?", time: '10:15 AM' },
      { id: 'm2', sender: 'me', text: "Hello! We'd be happy to help. Our Premium package includes management of 5 social channels and detailed weekly reports.", time: '10:18 AM', status: 'read' },
      { id: 'm3', sender: 'user', text: "Got it, thanks for the info. Could you please send a detailed price quote via email to info@minhanh.design for me?", time: '12:45 PM' }
    ]
  },
  {
    id: 'c2',
    name: 'Hoang Long',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=120',
    online: false,
    lastMsgTime: 'Yesterday',
    lastMsgText: 'Thank you so much!',
    unread: true,
    platform: 'instagram',
    workspace: 'general',
    account: 'main_store',
    messages: [
      { id: 'm4', sender: 'me', text: "Hi Long! Your order has been shipped. It should arrive by tomorrow.", time: '2:15 PM', status: 'read' },
      { id: 'm5', sender: 'user', text: 'Thank you so much!', time: 'Yesterday' }
    ]
  },
  {
    id: 'c3',
    name: 'Thanh Thuy',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=120',
    online: false,
    lastMsgTime: '2 days ago',
    lastMsgText: 'Does this service package include ad support?',
    unread: false,
    platform: 'tiktok',
    workspace: 'support',
    account: 'branch_a',
    messages: [
      { id: 'm6', sender: 'user', text: 'Does this service package include ad support?', time: '2 days ago' }
    ]
  }
]

export default function MessagesPage() {
  const [conversations, setConversations] = useState<Conversation[]>(INITIAL_CONVERSATIONS)
  const [selectedId, setSelectedId] = useState('c1')
  const [searchQuery, setSearchQuery] = useState('')
  const [filterPlatform, setFilterPlatform] = useState('all')
  const [filterWorkspace, setFilterWorkspace] = useState('all')
  const [filterAccount, setFilterAccount] = useState('all')
  const [inputText, setInputText] = useState('')
  const [isTyping, setIsTyping] = useState(false)

  const activeChat = conversations.find(c => c.id === selectedId) || conversations[0]
  const messageEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [activeChat?.messages, isTyping])

  const handleSend = () => {
    if (!inputText.trim()) return

    const now = new Date()
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    
    const newMsg: Message = {
      id: `my-${Date.now()}`,
      sender: 'me',
      text: inputText.trim(),
      time: timeStr,
      status: 'sent'
    }

    setConversations(prev => prev.map(c => {
      if (c.id === selectedId) {
        return {
          ...c,
          lastMsgText: newMsg.text,
          lastMsgTime: timeStr,
          messages: [...c.messages, newMsg]
        }
      }
      return c
    }))

    setInputText('')
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }

    // Trigger mock user automated typing response
    setIsTyping(true)
    setTimeout(() => {
      setIsTyping(false)
      const userReply: Message = {
        id: `reply-${Date.now()}`,
        sender: 'user',
        text: `Thanks for messaging! We've received your inquiry: "${newMsg.text.substring(0, 30)}..."`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
      
      setConversations(prev => prev.map(c => {
        if (c.id === selectedId) {
          return {
            ...c,
            lastMsgText: userReply.text,
            lastMsgTime: userReply.time,
            messages: [...c.messages, userReply]
          }
        }
        return c
      }))
    }, 2000)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleQuickAction = (text: string) => {
    setInputText(prev => prev ? `${prev} ${text}` : text)
    textareaRef.current?.focus()
  }

  const filteredConversations = conversations.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          c.lastMsgText.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesPlatform = filterPlatform === 'all' || c.platform === filterPlatform
    const matchesWorkspace = filterWorkspace === 'all' || c.workspace === filterWorkspace
    const matchesAccount = filterAccount === 'all' || c.account === filterAccount
    return matchesSearch && matchesPlatform && matchesWorkspace && matchesAccount
  })

  return (
    <div className={styles.container}>
      {/* Search Header */}
      <header className={styles.header}>
        <div className={styles.headerTitle}>
          <MessageSquare className={styles.headerIcon} />
          <h1>Inbox Messages</h1>
        </div>
        <div className={styles.searchBar}>
          <Search className={styles.searchIcon} size={16} />
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </header>

      {/* Main Grid */}
      <div className={styles.grid}>
        {/* Left Column: Sidebar List */}
        <section className={styles.sidebar}>
          <div className={styles.filterBar}>
            <SlidersHorizontal size={14} className={styles.filterIcon} />
            <select value={filterPlatform} onChange={(e) => setFilterPlatform(e.target.value)}>
              <option value="all">Platform</option>
              <option value="facebook">Facebook</option>
              <option value="instagram">Instagram</option>
              <option value="tiktok">TikTok</option>
            </select>
            <select value={filterWorkspace} onChange={(e) => setFilterWorkspace(e.target.value)}>
              <option value="all">Workspace</option>
              <option value="general">General</option>
              <option value="support">Support</option>
            </select>
            <select value={filterAccount} onChange={(e) => setFilterAccount(e.target.value)}>
              <option value="all">Account</option>
              <option value="main_store">Main Store</option>
              <option value="branch_a">Branch A</option>
            </select>
          </div>

          <div className={styles.conversationsList}>
            {filteredConversations.length === 0 ? (
              <div className={styles.emptyState}>No conversations found</div>
            ) : (
              filteredConversations.map(c => (
                <div
                  key={c.id}
                  className={`${styles.conversationItem} ${c.id === selectedId ? styles.active : ''} ${c.unread ? styles.unread : ''}`}
                  onClick={() => {
                    setSelectedId(c.id)
                    // Mark as read
                    setConversations(prev => prev.map(conv => conv.id === c.id ? { ...conv, unread: false } : conv))
                  }}
                >
                  <div className={styles.avatarWrapper}>
                    <img src={c.avatar} alt={c.name} className={styles.avatar} />
                    {c.online && <span className={styles.onlineBadge}></span>}
                  </div>
                  <div className={styles.convoMeta}>
                    <div className={styles.convoTop}>
                      <span className={styles.convoName}>{c.name}</span>
                      <span className={styles.convoTime}>{c.lastMsgTime}</span>
                    </div>
                    <div className={styles.convoBottom}>
                      <p className={styles.convoText}>{c.lastMsgText}</p>
                      {c.unread && <span className={styles.unreadDot}></span>}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Right Column: Chat Window */}
        <section className={styles.chatWindow}>
          {activeChat ? (
            <>
              {/* Chat Header */}
              <div className={styles.chatHeader}>
                <div className={styles.headerUser}>
                  <div className={styles.avatarWrapper}>
                    <img src={activeChat.avatar} alt={activeChat.name} className={styles.avatar} />
                    {activeChat.online && <span className={styles.onlineBadge}></span>}
                  </div>
                  <div>
                    <h3>{activeChat.name}</h3>
                    <span className={styles.onlineText}>{activeChat.online ? 'Online' : 'Offline'}</span>
                  </div>
                </div>
                <div className={styles.headerActions}>
                  <button title="Call"><Phone size={18} /></button>
                  <button title="Video Call"><Video size={18} /></button>
                  <button title="More Options"><MoreVertical size={18} /></button>
                </div>
              </div>

              {/* Messages List */}
              <div className={styles.messagesContainer}>
                <div className={styles.dateSeparator}>
                  <span>Today</span>
                </div>

                {activeChat.messages.map(m => (
                  <div key={m.id} className={`${styles.messageWrapper} ${m.sender === 'me' ? styles.myMessage : styles.userMessage}`}>
                    {m.sender === 'user' && (
                      <img src={activeChat.avatar} alt={activeChat.name} className={styles.msgAvatar} />
                    )}
                    <div className={styles.messageContent}>
                      <div className={styles.bubble}>
                        <p>{m.text}</p>
                      </div>
                      <div className={styles.msgMeta}>
                        <span className={styles.msgTime}>{m.time}</span>
                        {m.sender === 'me' && (
                          <CheckCircle2 size={12} className={styles.statusIcon} />
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {isTyping && (
                  <div className={styles.typingIndicator}>
                    <div className={styles.typingDots}>
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                    <span className={styles.typingText}>{activeChat.name} is typing...</span>
                  </div>
                )}
                <div ref={messageEndRef} />
              </div>

              {/* Input Area */}
              <div className={styles.inputArea}>
                <div className={styles.inputControls}>
                  <button className={styles.controlBtn} title="Add attachment"><PlusCircle size={20} /></button>
                  <button className={styles.controlBtn} title="Add Emoji"><Smile size={20} /></button>
                  
                  <div className={styles.textareaWrapper}>
                    <textarea
                      ref={textareaRef}
                      placeholder="Type a message..."
                      rows={1}
                      value={inputText}
                      onChange={(e) => {
                        setInputText(e.target.value)
                        // Auto-expand height
                        if (textareaRef.current) {
                          textareaRef.current.style.height = 'auto'
                          textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`
                        }
                      }}
                      onKeyDown={handleKeyPress}
                    />
                  </div>

                  <button className={styles.sendBtn} onClick={handleSend} title="Send Message">
                    <Send size={18} />
                  </button>
                </div>

                {/* Suggestions chips */}
                <div className={styles.chipsRow}>
                  <button onClick={() => handleQuickAction('📦 Check Order status:')}>📦 Check Order</button>
                  <button onClick={() => handleQuickAction('📍 Store Address details:')}>📍 Store Address</button>
                  <button onClick={() => handleQuickAction('💳 Payment Methods:')}>💳 Payment Method</button>
                </div>
              </div>
            </>
          ) : (
            <div className={styles.noChatSelected}>
              <MessageSquare size={48} />
              <p>Select a conversation to start messaging</p>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
