import { useState, useRef, useCallback, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useCalendar } from '../../context/calendarContextBase'
import { getMockResults } from '../../data/mockAI'
import type { AIGenerateInput } from '../../data/mockAI'
import { shortId } from '../../utils/shortId'
import { PLATFORMS, getActivePlatformIds, type Platform, type Tone, type MediaFile, type PlatformCaptionMap, type CreatePostModalProps } from './types'
import { api } from '../../api/axios'
import { mediaApi } from '../../api/media'
import { postsApi, type CreatePostPayload } from '../../api/posts'
import { useWorkspace } from '../../context/WorkspaceContext'
import { useIntegrations } from '../../hooks/useIntegrations'

export function convertCaptionForPlatform(base: string, _platform: Platform, maxChars: number): string {
  const clean = base.trim()
  if (!clean) return ''

  if (clean.length > maxChars) {
    return clean.substring(0, maxChars - 3) + '...'
  }

  return clean
}

export function useCreatePostState(props: CreatePostModalProps) {
  const { isOpen, onClose, onToast, initialContent, initialDate, editPost } = props
  const { user } = useAuth()
  const { updatePost, removePost, refreshPosts } = useCalendar()
  const { activeWorkspace } = useWorkspace()
  const { integrations } = useIntegrations()

  const isEditMode = !!editPost

  // Get connected platforms from integrations
  const connectedPlatformIds = getActivePlatformIds(integrations)
  
  const [activePlatforms, setActivePlatforms] = useState<Platform[]>(
    editPost ? [editPost.platform as Platform] : (connectedPlatformIds.length > 0 ? [PLATFORMS.find(p => p.id.toLowerCase() === connectedPlatformIds[0])?.id ?? 'TikTok'] : ['TikTok'])
  )
  const [activeTab, setActiveTab] = useState<Platform>(
    editPost ? (editPost.platform as Platform) : (connectedPlatformIds.length > 0 ? (PLATFORMS.find(p => p.id.toLowerCase() === connectedPlatformIds[0])?.id ?? 'TikTok') : 'TikTok')
  )

  const [captionsByPlatform, setCaptionsByPlatform] = useState<PlatformCaptionMap>({
    TikTok: '', Instagram: '', Facebook: '', X: ''
  })
  const [touched, setTouched] = useState<Record<Platform, boolean>>({
    TikTok: false, Instagram: false, Facebook: false, X: false
  })

  const [showAI, setShowAI] = useState(false)
  const [showPreview, setShowPreview] = useState(true)
  const tone: Tone = 'default'
  const [showEmoji, setShowEmoji] = useState(false)
  const [media, setMedia] = useState<MediaFile[]>([])
  const [dragOver, setDragOver] = useState(false)
  const [createAnother, setCreateAnother] = useState(false)
  const [scheduleMode, setScheduleMode] = useState(false)
  const [scheduleTime, setScheduleTime] = useState('')

  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false)
  const [showPublishConfirmDialog, setShowPublishConfirmDialog] = useState(false)

  const initialSnapshotRef = useRef<string | null>(null)
  const didInitRef = useRef(false)

  const [dragId, setDragId] = useState<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)

  const [aiPrompt, setAiPrompt] = useState('')
  const [aiResults, setAiResults] = useState<Array<{ id: string; type: string; caption: string }>>([])
  const [aiIsGenerating, setAiIsGenerating] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const replaceInputRef = useRef<HTMLInputElement>(null)
  const replaceTargetIdRef = useRef<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const emojiRef = useRef<HTMLDivElement>(null)

  const prevEditPostIdRef = useRef<string | null>(null)

  // Initialize state when modal opens or when editing a different post
  useEffect(() => {
    if (!isOpen) {
      didInitRef.current = false
      initialSnapshotRef.current = null
      prevEditPostIdRef.current = null
      if (showUnsavedDialog) {
        requestAnimationFrame(() => setShowUnsavedDialog(false))
      }
      return
    }
    
    // Reset init flag when editing a different post
    if (editPost && editPost.id !== prevEditPostIdRef.current) {
      didInitRef.current = false
      prevEditPostIdRef.current = editPost.id
    }
    
    if (didInitRef.current) return

    setTimeout(() => {
      let nextCaptions = { TikTok: '', Instagram: '', Facebook: '', X: '' } as PlatformCaptionMap
      let initPlatforms: Platform[] = connectedPlatformIds.length > 0 ? [PLATFORMS.find(p => p.id.toLowerCase() === connectedPlatformIds[0])?.id ?? 'TikTok'] : ['TikTok']
      let initSchMode = false
      let initSchTime = ''
      let loadedFromDraft = false
      let initMedia: MediaFile[] = []

      // Edit mode - load from existing post
      if (editPost) {
        nextCaptions = {
          TikTok: editPost.caption,
          Instagram: editPost.caption,
          Facebook: editPost.caption,
          X: editPost.caption
        }
        initPlatforms = [editPost.platform as Platform]

        initSchMode = true
        const mm = String(editPost.month + 1).padStart(2, '0')
        const dd = String(editPost.day).padStart(2, '0')
        initSchTime = `${editPost.year}-${mm}-${dd}T${editPost.time}`

        // Load media from mediaIds (async) - always fetch from backend for edit mode
        if (editPost.mediaIds && editPost.mediaIds.length > 0 && activeWorkspace) {
          ;(async () => {
            try {
              const res = await mediaApi.list(activeWorkspace.id)
              const matchedMedia = res.data
                .filter(m => editPost.mediaIds?.includes(m.id))
                .map(m => ({
                  id: shortId(),
                  url: m.url,
                  type: m.contentType?.startsWith('video') ? 'video' : 'image' as 'image' | 'video',
                  name: m.fileName,
                  backendId: m.id
                }))
              setMedia(matchedMedia)
            } catch (e) {
              console.error('Failed to load media for post', e)
            }
          })()
        }
      }
      else if (!initialContent && !initialDate) {
        try {
          const draftStr = localStorage.getItem('syncra_draft')
          if (draftStr) {
            const parsed = JSON.parse(draftStr)
            if (parsed.captionsByPlatform) nextCaptions = parsed.captionsByPlatform
            if (parsed.activePlatforms) initPlatforms = parsed.activePlatforms
            if (parsed.scheduleMode !== undefined) initSchMode = parsed.scheduleMode
            if (parsed.scheduleTime) initSchTime = parsed.scheduleTime
            loadedFromDraft = true
          }
        } catch (e) {
          console.error('Failed to parse draft', e)
        }
      }

      if (!loadedFromDraft) {
        if (initialContent && initialContent.trim()) {
          PLATFORMS.forEach(p => {
            nextCaptions[p.id] = convertCaptionForPlatform(initialContent, p.id, p.maxChars)
          })
        }

        if (initialDate) {
          initSchMode = true
          const { year, month, day } = initialDate
          const mm = String(month + 1).padStart(2, '0')
          const dd = String(day).padStart(2, '0')
          initSchTime = `${year}-${mm}-${dd}T09:00`
        }
      }

      setCaptionsByPlatform(nextCaptions)
      setTouched({ TikTok: false, Instagram: false, Facebook: false, X: false })
      setScheduleMode(initSchMode)
      setScheduleTime(initSchTime)
      setActivePlatforms(initPlatforms.length > 0 ? initPlatforms : ['TikTok'])
      setActiveTab(initPlatforms.length > 0 ? initPlatforms[0] : (connectedPlatformIds.length > 0 ? (PLATFORMS.find(p => p.id.toLowerCase() === connectedPlatformIds[0])?.id ?? 'TikTok') : 'TikTok'))
      setMedia(initMedia)

      // Nếu không load từ Draft, snapshot của Caption sẽ luôn trống.
      // Điều này đảm bảo khi có initialContent, trạng thái sẽ bị đánh dấu là Dirty (chưa lưu) ngay lập tức.
      initialSnapshotRef.current = JSON.stringify({
        captionsByPlatform: loadedFromDraft || editPost ? nextCaptions : { TikTok: '', Instagram: '', Facebook: '', X: '' },
        media: initMedia,
        activePlatforms: initPlatforms.length > 0 ? initPlatforms : ['TikTok'],
        scheduleMode: initSchMode,
        scheduleTime: initSchTime
      })
    }, 0)

    didInitRef.current = true
  }, [isOpen, initialContent, initialDate, showUnsavedDialog, editPost])

  const caption = captionsByPlatform[activeTab] ?? ''
  
  const setActiveCaption = (next: string) => {
    setCaptionsByPlatform(prev => ({ ...prev, [activeTab]: next }))
    setTouched(prev => ({ ...prev, [activeTab]: true }))
  }

  const currentSnapshot = JSON.stringify({
    captionsByPlatform,
    media,
    activePlatforms,
    scheduleMode,
    scheduleTime
  })

  const activeP = PLATFORMS.find(p => p.id === activeTab) ?? PLATFORMS[0]
  const charLimit = activeP.maxChars
  const overLimit = caption.length > charLimit
  const hasPlatforms = activePlatforms.length > 0

  // Helper to get integration for a platform
  const getIntegrationForPlatform = (platform: Platform) => {
    return integrations.find(i => i.platform.toLowerCase() === platform.toLowerCase() && i.isActive)
  }

  // Check if any selected platform has an active integration
  const hasIntegration = activePlatforms.some(p => getIntegrationForPlatform(p) !== undefined)
  const missingIntegrationPlatforms = activePlatforms.filter(p => !getIntegrationForPlatform(p))

  const reset = useCallback(() => {
    setEditingId(null)
    setMedia(prev => { prev.forEach(m => URL.revokeObjectURL(m.url)); return [] })

    setCaptionsByPlatform({ TikTok: '', Instagram: '', Facebook: '', X: '' })
    setTouched({ TikTok: false, Instagram: false, Facebook: false, X: false })

    setShowAI(false)
    setShowEmoji(false)
    setScheduleMode(false)
    setScheduleTime('')
    setActivePlatforms(['TikTok'])
    setActiveTab(connectedPlatformIds.length > 0 ? (PLATFORMS.find(p => p.id.toLowerCase() === connectedPlatformIds[0])?.id ?? 'TikTok') : 'TikTok')
    setAiPrompt('')
    setAiResults([])
    setAiIsGenerating(false)
    setShowUnsavedDialog(false)

    initialSnapshotRef.current = null
    didInitRef.current = false
  }, [connectedPlatformIds])

  // We should NOT store `isDirty` as a ref that we update during render.
  // We can just return it from the hook. But to keep the same signature without refactoring too much:
  // we can use a state, or just let `isDirty` be a normal variable and pass it where needed, or we only use `isDirty` in `handleAttemptClose` by re-evaluating it.

  const getIsDirty = useCallback(() => {
    return isOpen && initialSnapshotRef.current !== null && currentSnapshot !== initialSnapshotRef.current
  }, [isOpen, currentSnapshot])

  const handleAttemptClose = useCallback(() => {
    if (!getIsDirty()) {
      reset()
      onClose()
    } else {
      setShowUnsavedDialog(true)
    }
  }, [onClose, getIsDirty, reset])

  const handleDraft = async (): Promise<boolean> => {
    if (!hasPlatforms) {
      onToast?.({ message: 'Please select at least one channel first.', type: 'error' })
      return false
    }

    if (!activeWorkspace) {
      onToast?.({ message: 'No workspace selected.', type: 'error' })
      return false
    }

    let year: number, month: number, day: number, time: string

    if (scheduleTime && scheduleMode) {
      const scheduleDate = new Date(scheduleTime)
      year = scheduleDate.getFullYear()
      month = scheduleDate.getMonth()
      day = scheduleDate.getDate()
      time = scheduleTime.split('T')[1]?.slice(0, 5) || '09:00'
    } else {
      const today = new Date()
      year = today.getFullYear()
      month = today.getMonth()
      day = today.getDate()
      time = '09:00'
    }

    const platformColors: Record<string, string> = {
      TikTok: '#ff0050',
      Instagram: '#e1306c',
      Facebook: '#4267B2',
      X: '#1DA1F2'
    }

    try {
      // Upload media first and get backend GUIDs
      const mediaIds = await uploadMediaAndGetIds()
      const firstImage = media.find(m => m.type === 'image')?.url

      if (isEditMode && editPost) {
        // Update existing post as draft on backend
        const platform = activePlatforms[0] || editPost.platform
        const caption = captionsByPlatform[platform] || editPost.caption
        const hashtags = caption.match(/#[a-zA-Z0-9_]+/g)?.map(h => h.slice(1)) || editPost.hashtags
        const integration = getIntegrationForPlatform(platform as Platform)

        // Update on backend
        await postsApi.update(activeWorkspace.id, editPost.id, {
          title: caption.slice(0, 50) || `Draft on ${platform}`,
          content: caption,
          status: 'draft',
          integrationId: integration?.id || null,
          mediaIds
        })

        // Update local state
        updatePost(editPost.id, {
          title: caption.slice(0, 50) || `Draft on ${platform}`,
          platform,
          status: 'draft',
          time,
          day,
          month,
          year,
          color: platformColors[platform] || editPost.color,
          caption,
          hashtags,
          image: firstImage || editPost.image
        })
        onToast?.({ message: 'Draft updated successfully.', type: 'success' })
      } else {
        // Create new draft posts on backend
        for (const platform of activePlatforms) {
          const platformCaption = captionsByPlatform[platform] || ''
          const integration = getIntegrationForPlatform(platform)

          const mm = String(month + 1).padStart(2, '0')
          const dd = String(day).padStart(2, '0')
          const scheduledAtUtc = scheduleMode
            ? new Date(`${year}-${mm}-${dd}T${time}:00Z`).toISOString()
            : null

          // Create on backend
          const postPayload: CreatePostPayload = {
            title: platformCaption.slice(0, 50) || `Draft on ${platform}`,
            content: platformCaption,
            scheduledAtUtc,
            integrationId: integration?.id || null,
            mediaIds
          }

          await postsApi.create(activeWorkspace.id, postPayload)
        }
        onToast?.({ message: 'Draft saved successfully.', type: 'success' })
      }

      localStorage.removeItem('syncra_draft')
      await refreshPosts?.()

      initialSnapshotRef.current = currentSnapshot
      return true
    } catch (error: any) {
      console.error('Failed to save draft', error)
      const errorMsg = error?.response?.data?.errors?.[0]?.message || error?.response?.data?.message || 'Failed to save draft'
      onToast?.({ message: errorMsg, type: 'error' })
      return false
    }
  }

  const handleSchedule = () => {
    if (!hasPlatforms) {
      onToast?.({ message: 'Please select at least one channel first.', type: 'error' })
      return
    }
    if (!hasIntegration) {
      // In flexible mode, we allow scheduling but with a strong warning
      // However, if the user really wants to schedule to database, we can let them
      // But they can't publish yet.
      setShowPublishConfirmDialog(true)
      return
    }
    setShowPublishConfirmDialog(true)
  }

  const confirmPublishNow = async () => {
    const platformColors: Record<string, string> = {
      TikTok: '#ff0050',
      Instagram: '#e1306c',
      Facebook: '#4267B2',
      X: '#1DA1F2'
    }

    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth()
    const day = now.getDate()
    const time = now.toTimeString().slice(0, 5)

    try {
      // Upload media first and get backend GUIDs
      const mediaIds = await uploadMediaAndGetIds()

      if (isEditMode && editPost) {
        // Update existing post and publish
        const platform = activePlatforms[0] || editPost.platform
        const caption = captionsByPlatform[platform] || editPost.caption
        const hashtags = caption.match(/#[a-zA-Z0-9_]+/g)?.map(h => h.slice(1)) || editPost.hashtags
        const integration = getIntegrationForPlatform(platform as Platform)

        updatePost(editPost.id, {
          title: caption.slice(0, 50) || `Post on ${platform}`,
          platform,
          status: 'draft',
          time,
          day,
          month,
          year,
          color: platformColors[platform] || editPost.color,
          caption,
          hashtags,
          image: media.find(m => m.type === 'image')?.url || editPost.image
        })

        // Call publish endpoint
        await api.post(`/workspaces/${activeWorkspace?.id}/posts/${editPost.id}/publish`, {
          dryRun: false,
          integrationId: integration?.id
        })
        onToast?.({ message: 'Post published successfully!', type: 'success' })
      } else {
        // Create new posts and publish them
        for (const platform of activePlatforms) {
          const platformCaption = captionsByPlatform[platform] || ''
          const integration = getIntegrationForPlatform(platform)

          if (!integration) {
            onToast?.({
              message: `No integration found for ${platform}. Please connect this platform first.`,
              type: 'error'
            })
            continue
          }

          // Create post first (without scheduledAtUtc - will be draft)
          const postPayload: Record<string, any> = {
            title: platformCaption.slice(0, 50) || `Post on ${platform}`,
            content: platformCaption,
            scheduledAtUtc: null,
            integrationId: integration.id,
            mediaIds
          }

          const res = await api.post(`/workspaces/${activeWorkspace?.id}/posts`, postPayload)
          const postId = res.data.id

          // Call publish endpoint
          await api.post(`/workspaces/${activeWorkspace?.id}/posts/${postId}/publish`, { dryRun: false })
        }
        onToast?.({ message: `Post published successfully on ${activePlatforms.join(', ')}!`, type: 'success' })
      }

      localStorage.removeItem('syncra_draft')
      await refreshPosts?.()
      setShowPublishConfirmDialog(false)
      if (createAnother) {
        reset()
      } else {
        reset()
        onClose()
      }
    } catch (error: any) {
      console.error('Failed to publish post', error)
      const errorMsg = error?.response?.data?.errors?.[0]?.message || error?.response?.data?.message || 'Failed to publish post'
      onToast?.({ message: errorMsg, type: 'error' })
    }
  }

  const confirmSchedule = async () => {
    if (!scheduleTime) {
      onToast?.({ message: 'Please select a date and time for scheduling.', type: 'error' })
      return
    }

    const scheduleDate = new Date(scheduleTime)
    const year = scheduleDate.getFullYear()
    const month = scheduleDate.getMonth()
    const day = scheduleDate.getDate()
    const time = scheduleTime.split('T')[1]?.slice(0, 5) || '09:00'

    const platformColors: Record<string, string> = {
      TikTok: '#ff0050',
      Instagram: '#e1306c',
      Facebook: '#4267B2',
      X: '#1DA1F2'
    }

    try {
      // Upload media first and get backend GUIDs
      const mediaIds = await uploadMediaAndGetIds()

      if (isEditMode && editPost) {
        // Update existing post
        const platform = activePlatforms[0] || editPost.platform
        const caption = captionsByPlatform[platform] || editPost.caption
        const hashtags = caption.match(/#[a-zA-Z0-9_]+/g)?.map(h => h.slice(1)) || editPost.hashtags
        const integration = getIntegrationForPlatform(platform as Platform)

        updatePost(editPost.id, {
          title: caption.slice(0, 50) || `Post on ${platform}`,
          platform,
          status: 'scheduled',
          time,
          day,
          month,
          year,
          color: platformColors[platform] || editPost.color,
          caption,
          hashtags,
          image: media.find(m => m.type === 'image')?.url || editPost.image
        })

        // If scheduling, update the post with integration and scheduled time via the publish endpoint
        if (integration) {
          await api.post(`/workspaces/${activeWorkspace?.id}/posts/${editPost.id}/publish`, {
            scheduledAtUtc: scheduleDate.toISOString()
          })
        }
        onToast?.({ message: 'Post updated successfully!', type: 'success' })
      } else {
        // Create new posts
        for (const platform of activePlatforms) {
          const platformCaption = captionsByPlatform[platform] || ''
          const integration = getIntegrationForPlatform(platform)

          if (!integration) {
            onToast?.({
              message: `No integration found for ${platform}. Please connect this platform first.`,
              type: 'error'
            })
            continue
          }

          const d = new Date(year, month, day)
          const [h, m] = time.split(':').map(Number)
          d.setHours(h, m, 0)

          await api.post(`/workspaces/${activeWorkspace?.id}/posts`, {
            title: platformCaption.slice(0, 50) || `Post on ${platform}`,
            content: platformCaption,
            scheduledAtUtc: d.toISOString(),
            integrationId: integration.id,
            mediaIds
          })
        }
        onToast?.({ message: `Post scheduled successfully on ${activePlatforms.join(', ')}!`, type: 'success' })
      }

      localStorage.removeItem('syncra_draft')
      await refreshPosts?.()
      setShowPublishConfirmDialog(false)
      if (createAnother) {
        reset()
      } else {
        reset()
        onClose()
      }
    } catch (error: any) {
      console.error('Failed to schedule post', error)
      const errorMsg = error?.response?.data?.errors?.[0]?.message || error?.response?.data?.message || 'Failed to schedule post'
      onToast?.({ message: errorMsg, type: 'error' })
    }
  }

  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (editingId) {
        setEditingId(null)
        return
      }
      if (showUnsavedDialog) {
        setShowUnsavedDialog(false)
        return
      }
      handleAttemptClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isOpen, editingId, showUnsavedDialog, handleAttemptClose])

  useEffect(() => {
    if (!showEmoji) return
    const handler = (e: MouseEvent) => {
      if (emojiRef.current && !emojiRef.current.contains(e.target as Node)) setShowEmoji(false)
    }
    window.addEventListener('mousedown', handler)
    return () => window.removeEventListener('mousedown', handler)
  }, [showEmoji])

  const togglePlatform = (p: Platform) => {
    setActivePlatforms(prev => {
      const next = prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]
      if (!next.includes(activeTab) && next.length > 0) {
        setActiveTab(next[0])
      }
      return next
    })
  }

  const handleFiles = useCallback((files: FileList | null) => {
    if (!files) return
    Array.from(files).forEach(file => {
      const type = file.type.startsWith('video') ? 'video' : 'image'
      
      if (type === 'image') {
        // Convert to base64 for persistence
        const reader = new FileReader()
        reader.onload = () => {
          setMedia(prev => [...prev, { 
            id: shortId(), 
            url: reader.result as string, 
            type, 
            name: file.name 
          }])
        }
        reader.readAsDataURL(file)
      } else {
        const url = URL.createObjectURL(file)
        setMedia(prev => [...prev, { id: shortId(), url, type, name: file.name }])
      }
    })
  }, [])

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    handleFiles(e.dataTransfer.files)
  }

  const removeMedia = (id: string) => {
    setMedia(prev => {
      const item = prev.find(m => m.id === id)
      if (item) URL.revokeObjectURL(item.url)
      return prev.filter(m => m.id !== id)
    })
    setEditingId(prev => (prev === id ? null : prev))
  }

  const handleDragStart = (id: string) => setDragId(id)
  const handleDragOver = (e: React.DragEvent, id: string) => { e.preventDefault(); setDragOverId(id) }
  const handleDropOnThumb = (id: string) => {
    if (!dragId || dragId === id) { setDragId(null); setDragOverId(null); return }
    setMedia(prev => {
      const from = prev.findIndex(m => m.id === dragId)
      const to = prev.findIndex(m => m.id === id)
      if (from < 0 || to < 0) return prev
      const next = [...prev]
      const [item] = next.splice(from, 1)
      next.splice(to, 0, item)
      return next
    })
    setDragId(null); setDragOverId(null)
  }
  const handleDragEnd = () => { setDragId(null); setDragOverId(null) }

  const handleReplaceVideo = (id: string) => {
    replaceTargetIdRef.current = id
    replaceInputRef.current?.click()
  }

  const handleReplaceFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    const targetId = replaceTargetIdRef.current
    if (!file || !targetId) return
    const newUrl = URL.createObjectURL(file)
    const newType: 'image' | 'video' = file.type.startsWith('video') ? 'video' : 'image'
    setMedia(prev => prev.map(m => {
      if (m.id !== targetId) return m
      URL.revokeObjectURL(m.url)
      return { ...m, url: newUrl, type: newType, name: file.name }
    }))
    e.target.value = ''
    replaceTargetIdRef.current = null
  }

  const handleEditorSave = (blob: Blob) => {
    if (!editingId) return
    const newUrl = URL.createObjectURL(blob)
    setMedia(prev => prev.map(m => {
      if (m.id !== editingId) return m
      URL.revokeObjectURL(m.url)
      return { ...m, url: newUrl, name: m.name.replace(/\.[^.]+$/, '') + '_edited.jpg' }
    }))
    setEditingId(null)
  }

  const insertAtCursor = (text: string) => {
    const el = textareaRef.current
    if (!el) { setActiveCaption(caption + text); return }
    const start = el.selectionStart ?? caption.length
    const end = el.selectionEnd ?? caption.length
    const next = caption.slice(0, start) + text + caption.slice(end)
    setActiveCaption(next)
    setTimeout(() => {
      el.selectionStart = el.selectionEnd = start + text.length
      el.focus()
    }, 0)
  }

  const handleGenerateAI = () => {
    if (aiPrompt.trim() === '') return
    setAiIsGenerating(true)
    const input: AIGenerateInput = { topic: aiPrompt, niche: '', audience: '', goal: '', tone: tone }
    setTimeout(() => {
      setAiResults(getMockResults(input).slice(0, 4))
      setAiIsGenerating(false)
    }, 800)
  }

  // Upload all media files that haven't been uploaded yet and return their backend GUIDs
  const uploadMediaAndGetIds = useCallback(async (): Promise<string[]> => {
    const mediaWithoutBackendId = media.filter(m => !m.backendId && m.type === 'image')
    const existingIds = media.filter(m => m.backendId).map(m => m.backendId!)

    if (mediaWithoutBackendId.length === 0) {
      return existingIds
    }

    const newIds: string[] = []

    for (const mediaItem of mediaWithoutBackendId) {
      try {
        // Convert base64/blob URL to File
        const response = await fetch(mediaItem.url)
        const blob = await response.blob()
        const file = new File([blob], mediaItem.name, { type: mediaItem.type === 'image' ? 'image/jpeg' : 'video/mp4' })

        // Upload to backend
        const uploadResult = await mediaApi.upload(activeWorkspace!.id, file)
        const backendId = uploadResult.data.id

        // Update media with backend ID
        setMedia(prev => prev.map(m =>
          m.id === mediaItem.id ? { ...m, backendId } : m
        ))

        newIds.push(backendId)
      } catch (error) {
        console.error('Failed to upload media:', mediaItem.name, error)
        throw new Error(`Failed to upload ${mediaItem.name}`)
      }
    }

    return [...existingIds, ...newIds]
  }, [media, activeWorkspace])

  const handleDelete = useCallback(async () => {
    if (!editPost) return
    if (!confirm('Are you sure you want to delete this post?')) return
    
    try {
      await removePost(editPost.id)
      onToast?.({ message: 'Post deleted successfully', type: 'success' })
      onClose()
    } catch (error) {
      onToast?.({ message: 'Failed to delete post', type: 'error' })
      console.error(error)
    }
  }, [editPost, removePost, onToast, onClose])

  const applyAISuggestion = (suggestion: string) => {
    setActiveCaption(suggestion)
  }

  const refs = {
    fileInputRef,
    replaceInputRef,
    replaceTargetIdRef,
    textareaRef,
    emojiRef,
  }

  return {
    state: {
      activePlatforms, activeTab, captionsByPlatform, touched,
      showAI, showPreview, tone, showEmoji, media, dragOver,
      createAnother, scheduleMode, scheduleTime, showUnsavedDialog,
      showPublishConfirmDialog,
      dragId, dragOverId, aiPrompt, aiResults, aiIsGenerating, editingId,
      user, caption, charLimit, overLimit, hasPlatforms, activeP,
      hasIntegration, missingIntegrationPlatforms,
      currentSnapshot, isEditMode, editPost, connectedPlatformIds
    },
    refs,
    actions: {
      setActivePlatforms, setActiveTab, setCaptionsByPlatform, setTouched,
      setShowAI, setShowPreview, setShowEmoji, setMedia, setDragOver,
      setCreateAnother, setScheduleMode, setScheduleTime, setShowUnsavedDialog,
      setShowPublishConfirmDialog,
      setDragId, setDragOverId, setAiPrompt, setAiResults, setAiIsGenerating,
      setEditingId, setActiveCaption, reset, handleAttemptClose, handleDraft,
      handleSchedule, confirmPublishNow, confirmSchedule, togglePlatform, handleFiles, onDrop, removeMedia,
      handleDragStart, handleDragOver, handleDropOnThumb, handleDragEnd,
      handleReplaceVideo, handleReplaceFile, handleEditorSave, insertAtCursor,
      handleGenerateAI, applyAISuggestion, handleDelete
    }
  }
}

export type UseCreatePostStateReturn = ReturnType<typeof useCreatePostState>