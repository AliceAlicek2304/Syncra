import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useWorkspace } from '../../context/WorkspaceContext'
import { useCalendar } from '../../context/calendarContextBase'
import { useCreatePostMedia } from '../../hooks/useCreatePostMedia'
import { useCreatePostAI } from '../../hooks/useCreatePostAI'
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query'
import { shortId } from '../../utils/shortId'
import { postsApi } from '../../api/posts'
import { socialAccountsApi } from '../../api/socialAccounts'
import { PLATFORMS, type Platform, type Tone, type PlatformCaptionMap, type CreatePostModalProps } from './types'

function convertCaptionForPlatform(base: string, _platform: Platform, maxChars: number): string {
  const clean = base.trim()
  if (!clean) return ''
  if (clean.length > maxChars) return clean.substring(0, maxChars - 3) + '...'
  return clean
}

export function useCreatePostState(props: CreatePostModalProps) {
  const { isOpen, onClose, onToast, initialContent, initialDate, editPost } = props
  const { user } = useAuth()
  const { addPost, updatePost } = useCalendar()

  const isEditMode = !!editPost

  const mediaHook = useCreatePostMedia()
  const aiHook = useCreatePostAI()
  const queryClient = useQueryClient()
  const { activeWorkspace } = useWorkspace()
  const workspaceId = activeWorkspace?.id

  const { data: socialAccounts = [] } = useQuery({
    queryKey: ['social-accounts', workspaceId],
    enabled: Boolean(workspaceId),
    queryFn: () => socialAccountsApi.listSocialAccounts(workspaceId!),
  })

  const [selectedSocialAccountIds, setSelectedSocialAccountIds] = useState<string[]>([])

  useEffect(() => {
    if (socialAccounts.length > 0 && selectedSocialAccountIds.length === 0) {
      setSelectedSocialAccountIds(socialAccounts.filter(a => a.isActive).map(a => a.id))
    }
  }, [socialAccounts])

  const retryZernioPost = useMutation({
    mutationFn: async (postId: string) => {
      if (!workspaceId) throw new Error('No workspace id')
      return postsApi.retryZernioPost(workspaceId, postId)
    },
    onSuccess: () => {
      onToast?.({ message: 'Retrying failed targets...', type: 'success' })
      void queryClient.invalidateQueries({ queryKey: ['calendar-posts'] })
      void queryClient.invalidateQueries({ queryKey: ['dashboard-recent-posts'] })
      onClose()
    },
    onError: () => {
      onToast?.({ message: 'Failed to retry post.', type: 'error' })
    }
  })

  const deleteZernioPost = useMutation({
    mutationFn: async (postId: string) => {
      if (!workspaceId) throw new Error('No workspace id')
      return postsApi.deleteZernioPost(workspaceId, postId)
    },
    onSuccess: () => {
      onToast?.({ message: 'Post cancelled and deleted.', type: 'success' })
      void queryClient.invalidateQueries({ queryKey: ['calendar-posts'] })
      void queryClient.invalidateQueries({ queryKey: ['dashboard-recent-posts'] })
      onClose()
    },
    onError: () => {
      onToast?.({ message: 'Failed to delete post.', type: 'error' })
    }
  })

  const [activePlatforms, setActivePlatforms] = useState<Platform[]>(['tiktok'])
  const [activeTab, setActiveTab] = useState<Platform>('tiktok')
  const [captionsByPlatform, setCaptionsByPlatform] = useState<PlatformCaptionMap>({
    tiktok: '', instagram: '', facebook: '', twitter: '', linkedin: '', youtube: '', pinterest: ''
  })
  const [touched, setTouched] = useState<Record<Platform, boolean>>({
    tiktok: false, instagram: false, facebook: false, twitter: false, linkedin: false, youtube: false, pinterest: false
  })

  const [showPreview, setShowPreview] = useState(true)
  const tone: Tone = 'default'
  const [showEmoji, setShowEmoji] = useState(false)
  const [createAnother, setCreateAnother] = useState(false)
  const [scheduleMode, setScheduleMode] = useState(false)
  const [scheduleTime, setScheduleTime] = useState('')
  const [publishingTab, setPublishingTab] = useState<'schedule' | 'now' | 'queue' | 'draft'>('schedule')

  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false)
  const [showPublishConfirmDialog, setShowPublishConfirmDialog] = useState(false)

  const initialSnapshotRef = useRef<string | null>(null)
  const didInitRef = useRef(false)

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const emojiRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) {
      didInitRef.current = false
      initialSnapshotRef.current = null
      if (showUnsavedDialog) {
        requestAnimationFrame(() => setShowUnsavedDialog(false))
      }
      return
    }
    if (didInitRef.current) return

    setTimeout(() => {
      let nextCaptions = { tiktok: '', instagram: '', facebook: '', twitter: '', linkedin: '', youtube: '', pinterest: '' } as PlatformCaptionMap
      let initPlatforms: Platform[] = ['tiktok']
      let initSchMode = false
      let initSchTime = ''
      let loadedFromDraft = false

      if (editPost) {
        nextCaptions = {
          tiktok: editPost.caption,
          instagram: editPost.caption,
          facebook: editPost.caption,
          twitter: editPost.caption,
          linkedin: editPost.caption,
          youtube: editPost.caption,
          pinterest: editPost.caption
        }
        initPlatforms = [editPost.platform as Platform]

        if (editPost.image) {
          mediaHook.setMedia([{ id: shortId(), url: editPost.image, type: 'image', name: 'image' }])
        }

        initSchMode = true
        const mm = String(editPost.month + 1).padStart(2, '0')
        const dd = String(editPost.day).padStart(2, '0')
        initSchTime = `${editPost.year}-${mm}-${dd}T${editPost.time}`
      } else if (!initialContent && !initialDate) {
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
      setTouched({ tiktok: false, instagram: false, facebook: false, twitter: false, linkedin: false, youtube: false, pinterest: false })
      setScheduleMode(initSchMode)
      setScheduleTime(initSchTime)
      setPublishingTab(editPost?.status === 'draft' ? 'draft' : initSchMode ? 'schedule' : 'now')
      setActivePlatforms(initPlatforms.length > 0 ? initPlatforms : ['tiktok'])
      setActiveTab(initPlatforms.length > 0 ? initPlatforms[0] : 'tiktok')

      initialSnapshotRef.current = JSON.stringify({
        captionsByPlatform: loadedFromDraft || editPost ? nextCaptions : { tiktok: '', instagram: '', facebook: '', twitter: '', linkedin: '', youtube: '', pinterest: '' },
        media: mediaHook.media,
        activePlatforms: initPlatforms.length > 0 ? initPlatforms : ['tiktok'],
        scheduleMode: initSchMode,
        scheduleTime: initSchTime
      })
    }, 0)

    didInitRef.current = true
  }, [isOpen, initialContent, initialDate, showUnsavedDialog, editPost, mediaHook])

  const caption = captionsByPlatform[activeTab] ?? ''

  const setActiveCaption = (next: string) => {
    if (socialAccounts.filter(a => a.isActive).length > 0) {
      setCaptionsByPlatform({
        tiktok: next,
        instagram: next,
        facebook: next,
        twitter: next,
        linkedin: next,
        youtube: next,
        pinterest: next
      })
    } else {
      setCaptionsByPlatform(prev => ({ ...prev, [activeTab]: next }))
    }
    setTouched(prev => ({ ...prev, [activeTab]: true }))
  }

  const currentSnapshot = JSON.stringify({
    captionsByPlatform,
    media: mediaHook.media,
    activePlatforms,
    scheduleMode,
    scheduleTime
  })

  const activeP = PLATFORMS.find(p => p.id === activeTab) ?? PLATFORMS[0]
  const charLimit = activeP.maxChars
  const overLimit = caption.length > charLimit
  const hasPlatforms = socialAccounts.filter(a => a.isActive).length > 0
    ? selectedSocialAccountIds.length > 0
    : activePlatforms.length > 0

  const reset = useCallback(() => {
    mediaHook.resetMedia()
    aiHook.resetAI()
    setShowEmoji(false)
    setScheduleMode(false)
    setScheduleTime('')
    setActivePlatforms(['tiktok'])
    setActiveTab('tiktok')
    setShowUnsavedDialog(false)
    initialSnapshotRef.current = null
    didInitRef.current = false
  }, [mediaHook, aiHook])

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

  const handleDraft = (): boolean => {
    if (!hasPlatforms) {
      onToast?.({ message: 'Please select at least one channel first.', type: 'error' })
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
      tiktok: '#ff0050',
      instagram: '#e1306c',
      facebook: '#4267B2',
      twitter: '#1DA1F2'
    }

    const firstImage = mediaHook.media.find(m => m.type === 'image')?.url

    if (isEditMode && editPost) {
      const platform = activePlatforms[0] || editPost.platform
      const cap = captionsByPlatform[platform] || editPost.caption
      const hashtags = cap.match(/#[a-zA-Z0-9_]+/g)?.map(h => h.slice(1)) || editPost.hashtags

      updatePost(editPost.id, {
        title: cap.slice(0, 50) || `Draft on ${platform}`,
        platform,
        status: 'draft',
        time,
        day,
        month,
        year,
        color: platformColors[platform] || editPost.color,
        caption: cap,
        hashtags,
        image: firstImage || editPost.image
      })
      onToast?.({ message: 'Draft updated successfully.', type: 'success' })
    } else {
      activePlatforms.forEach(platform => {
        const platformCaption = captionsByPlatform[platform] || ''
        const platformHashtags = platformCaption.match(/#[a-zA-Z0-9_]+/g)?.map(h => h.slice(1)) || []

        addPost({
          year,
          month,
          day,
          title: platformCaption.slice(0, 50) || `Draft on ${platform}`,
          platform,
          status: 'draft',
          time,
          color: platformColors[platform] || '#888888',
          caption: platformCaption,
          hashtags: platformHashtags,
          image: firstImage
        })
      })
      onToast?.({ message: 'Draft saved successfully.', type: 'success' })
    }

    localStorage.removeItem('syncra_draft')
    initialSnapshotRef.current = currentSnapshot
    return true
  }

  const handleSchedule = () => {
    if (!hasPlatforms) {
      onToast?.({ message: 'Please select at least one channel first.', type: 'error' })
      return
    }
    setShowPublishConfirmDialog(true)
  }

  const confirmSchedule = async () => {
    if (selectedSocialAccountIds.length >= 1) {
      if (!workspaceId) return

      const content = caption || ''
      const title = content.slice(0, 50) || 'Untitled Post'
      const scheduledAtUtc = scheduleMode && scheduleTime ? new Date(scheduleTime).toISOString() : undefined
      const publishNow = !scheduleMode

      try {
        await postsApi.createZernioPost(workspaceId, {
          title,
          content,
          socialAccountIds: selectedSocialAccountIds,
          scheduledAtUtc,
          publishNow
        })

        onToast?.({
          message: `Post ${publishNow ? 'published' : 'scheduled'} successfully on Zernio!`,
          type: 'success'
        })

        void queryClient.invalidateQueries({ queryKey: ['calendar-posts'] })
        void queryClient.invalidateQueries({ queryKey: ['dashboard-recent-posts'] })

        localStorage.removeItem('syncra_draft')
        setShowPublishConfirmDialog(false)
        reset()
        if (!createAnother) onClose()
      } catch (err) {
        onToast?.({ message: 'Failed to create post. Please try again.', type: 'error' })
      }
      return
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
      tiktok: '#ff0050',
      instagram: '#e1306c',
      facebook: '#4267B2',
      twitter: '#1DA1F2'
    }

    const firstImage = mediaHook.media.find(m => m.type === 'image')?.url

    if (isEditMode && editPost) {
      const platform = activePlatforms[0] || editPost.platform
      const cap = captionsByPlatform[platform] || editPost.caption
      const hashtags = cap.match(/#[a-zA-Z0-9_]+/g)?.map(h => h.slice(1)) || editPost.hashtags

      updatePost(editPost.id, {
        title: cap.slice(0, 50) || `Post on ${platform}`,
        platform,
        status: 'scheduled',
        time,
        day,
        month,
        year,
        color: platformColors[platform] || editPost.color,
        caption: cap,
        hashtags,
        image: firstImage || editPost.image
      })
      onToast?.({ message: 'Post updated successfully!', type: 'success' })
    } else {
      activePlatforms.forEach(platform => {
        const platformCaption = captionsByPlatform[platform] || ''
        const platformHashtags = platformCaption.match(/#[a-zA-Z0-9_]+/g)?.map(h => h.slice(1)) || []

        addPost({
          year,
          month,
          day,
          title: platformCaption.slice(0, 50) || `Post on ${platform}`,
          platform,
          status: 'scheduled',
          time,
          color: platformColors[platform] || '#888888',
          caption: platformCaption,
          hashtags: platformHashtags,
          image: firstImage
        })
      })
      onToast?.({ message: `Post scheduled successfully on ${activePlatforms.join(', ')}!`, type: 'success' })
    }

    localStorage.removeItem('syncra_draft')
    setShowPublishConfirmDialog(false)

    reset()
    if (!createAnother) onClose()
  }

  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (mediaHook.editingId) {
        mediaHook.setEditingId(null)
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
  }, [isOpen, mediaHook, mediaHook.editingId, mediaHook.setEditingId, showUnsavedDialog, handleAttemptClose])

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

  const refs = {
    fileInputRef: mediaHook.fileInputRef,
    replaceInputRef: mediaHook.replaceInputRef,
    replaceTargetIdRef: mediaHook.replaceTargetIdRef,
    textareaRef,
    emojiRef,
  }

  const derivedActivePlatforms = useMemo(() => {
    const activeAccounts = socialAccounts.filter(a => a.isActive)
    if (activeAccounts.length > 0) {
      const selectedAccounts = activeAccounts.filter(a => selectedSocialAccountIds.includes(a.id))
      const platforms = Array.from(new Set(selectedAccounts.map(a => a.platform as Platform)))
      return platforms
    }
    return activePlatforms
  }, [socialAccounts, selectedSocialAccountIds, activePlatforms])

  useEffect(() => {
    if (derivedActivePlatforms.length > 0) {
      if (!derivedActivePlatforms.includes(activeTab)) {
        setActiveTab(derivedActivePlatforms[0])
      }
    }
  }, [derivedActivePlatforms, activeTab])

  const reuseLastPost = useCallback(async () => {
    if (!workspaceId) return
    try {
      const posts = await postsApi.getPosts(workspaceId, { status: 'published', pageSize: 10 })
      const lastPost = posts.find(p => p.content)
      if (lastPost) {
        const text = lastPost.content || ''
        setActiveCaption(text)
        const firstImage = lastPost.mediaItems?.find(m => m.type === 'image' || m.mimeType?.startsWith('image/'))?.url
        if (firstImage) {
          mediaHook.setMedia([{ id: shortId(), url: firstImage, type: 'image', name: 'image' }])
        }
        onToast?.({ message: 'Reused content from your last post!', type: 'success' })
      } else {
        onToast?.({ message: 'No published posts found to reuse.', type: 'success' })
      }
    } catch (err) {
      console.error(err)
      onToast?.({ message: 'Failed to retrieve last post.', type: 'error' })
    }
  }, [workspaceId, mediaHook, onToast])

  return {
    state: {
      activePlatforms: derivedActivePlatforms, activeTab, captionsByPlatform, touched,
      showPreview, tone, showEmoji,
      createAnother, scheduleMode, scheduleTime, showUnsavedDialog,
      showPublishConfirmDialog,
      user, caption, charLimit, overLimit, hasPlatforms, activeP,
      currentSnapshot, isEditMode, editPost,
      media: mediaHook.media,
      dragOver: mediaHook.dragOver,
      dragId: mediaHook.dragId,
      dragOverId: mediaHook.dragOverId,
      editingId: mediaHook.editingId,
      showAI: aiHook.showAI,
      aiPrompt: aiHook.aiPrompt,
      aiResults: aiHook.aiResults,
      aiIsGenerating: aiHook.aiIsGenerating,
      socialAccounts,
      selectedSocialAccountIds,
      publishingTab,
    },
    refs,
    actions: {
      setActivePlatforms, setActiveTab, setCaptionsByPlatform, setTouched,
      setShowPreview, setShowEmoji,
      setCreateAnother, setScheduleMode, setScheduleTime, setShowUnsavedDialog,
      setShowPublishConfirmDialog,
      setPublishingTab,
      setActiveCaption, reset, handleAttemptClose, handleDraft,
      handleSchedule, confirmSchedule, togglePlatform,
      handleFiles: mediaHook.handleFiles, onDrop: mediaHook.onDrop,
      removeMedia: mediaHook.removeMedia,
      handleDragStart: mediaHook.handleDragStart, handleDragOver: mediaHook.handleDragOver,
      handleDropOnThumb: mediaHook.handleDropOnThumb, handleDragEnd: mediaHook.handleDragEnd,
      handleReplaceVideo: mediaHook.handleReplaceVideo,
      handleReplaceFile: mediaHook.handleReplaceFile,
      handleEditorSave: mediaHook.handleEditorSave,
      setMedia: mediaHook.setMedia, setDragOver: mediaHook.setDragOver,
      setEditingId: mediaHook.setEditingId,
      handleGenerateAI: aiHook.handleGenerateAI, applyAISuggestion: aiHook.applyAISuggestion,
      setShowAI: aiHook.setShowAI, setAiPrompt: aiHook.setAiPrompt,
      setAiResults: aiHook.setAiResults, setAiIsGenerating: aiHook.setAiIsGenerating,
      insertAtCursor,
      retryZernioPost: () => { if (editPost) retryZernioPost.mutate(editPost.id) },
      deleteZernioPost: () => { if (editPost) deleteZernioPost.mutate(editPost.id) },
      isRetryingZernio: retryZernioPost.isPending,
      isDeletingZernio: deleteZernioPost.isPending,
      setSelectedSocialAccountIds,
      reuseLastPost,
    }
  }
}

export type UseCreatePostStateReturn = ReturnType<typeof useCreatePostState>
