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
import { mediaApi } from '../../api/media'
import { PLATFORMS, type Platform, type Tone, type PlatformCaptionMap, type CreatePostModalProps } from './types'
import type { AllPlatformData } from './PlatformSpecificForm'

export function getUtcString(localStr: string, timezone: string): string | undefined {
  if (!localStr) return undefined
  const [datePart, timePart] = localStr.split('T')
  if (!datePart || !timePart) return undefined
  const [year, month, day] = datePart.split('-').map(Number)
  const [hours, minutes] = timePart.split(':').map(Number)
  
  const utcDate = new Date(Date.UTC(year, month - 1, day, hours, minutes))
  
  const timezoneOffsets: Record<string, number> = {
    'Bangkok': 7,
    'UTC': 0,
    'New_York': -5,
    'London': 0,
    'Tokyo': 9
  }
  const offsetHours = timezoneOffsets[timezone] ?? 7
  
  utcDate.setHours(utcDate.getHours() - offsetHours)
  return utcDate.toISOString()
}

export function getPlatformValidationError(platform: Platform, media: any[]): string | null {
  if (platform === 'tiktok') {
    if (media.length === 0) {
      return 'TikTok requires at least one media file (image or video).'
    }
  }
  if (platform === 'youtube') {
    const hasVideo = media.some(m => m.type === 'video')
    if (media.length === 0 || !hasVideo) {
      return 'YouTube requires a video file.'
    }
  }
  return null
}

function convertCaptionForPlatform(base: string, _platform: Platform, maxChars: number): string {
  const clean = base.trim()
  if (!clean) return ''
  if (clean.length > maxChars) return clean.substring(0, maxChars - 3) + '...'
  return clean
}

function prepareTikTokSettings(data?: any) {
  if (!data) return undefined
  return {
    draft: data.draft,
    privacy_level: data.privacyLevel,
    allow_comment: data.allowComment,
    allow_duet: data.allowDuet,
    allow_stitch: data.allowStitch,
    commercial_content_type: data.commercialContentType,
    brand_partner_promote: data.brandPartnerPromote,
    is_brand_organic_post: data.isBrandOrganicPost,
    content_preview_confirmed: data.contentPreviewConfirmed,
    express_consent_given: data.expressConsentGiven,
    media_type: data.mediaType,
    video_cover_timestamp_ms: data.videoCoverTimestampMs,
    video_cover_image_url: data.videoCoverImageUrl,
    photo_cover_index: data.photoCoverIndex,
    auto_add_music: data.autoAddMusic,
    video_made_with_ai: data.videoMadeWithAi,
    description: data.description,
  }
}

export function useCreatePostState(props: CreatePostModalProps) {
  const { isOpen, onClose, onToast, initialContent, initialDate, editPost } = props
  const { user } = useAuth()
  const { addPost, updatePost } = useCalendar()

  const isEditMode = !!editPost

  const { workspaces, activeWorkspace } = useWorkspace()
  const workspaceId = activeWorkspace?.id

  const mediaHook = useCreatePostMedia()
  const aiHook = useCreatePostAI()
  const queryClient = useQueryClient()

  /**
   * Upload any media items that still have a local blob/data URL.
   * Returns a copy of the media array where every item has a public URL.
   * Throws if any upload fails.
   */
  const uploadPendingMedia = useCallback(async (wsId: string) => {
    const resolved = await Promise.all(
      mediaHook.media.map(async (m) => {
        // Already a public URL — nothing to do
        if (!m.file && !m.url.startsWith('blob:') && !m.url.startsWith('data:')) {
          return m
        }
        // Upload and get back the public S3 URL
        if (!m.file) {
          throw new Error(`Media item "${m.name}" has a local URL but no File object — cannot upload.`)
        }
        const asset = await mediaApi.uploadMedia(wsId, m.file)
        return { ...m, url: asset.publicUrl, mimeType: asset.mimeType, file: undefined }
      })
    )
    return resolved
  }, [mediaHook.media])

  // Multi-workspace selection state
  const [selectedWorkspaceIds, setSelectedWorkspaceIds] = useState<string[]>([])

  useEffect(() => {
    if (isOpen && activeWorkspace && selectedWorkspaceIds.length === 0) {
      setSelectedWorkspaceIds([activeWorkspace.id])
    }
  }, [isOpen, activeWorkspace])

  // Fetch social accounts for all selected workspaces
  const { data: socialAccounts = [] } = useQuery({
    queryKey: ['social-accounts-multiple', selectedWorkspaceIds],
    enabled: selectedWorkspaceIds.length > 0,
    queryFn: async () => {
      const results = await Promise.all(
        selectedWorkspaceIds.map(id => socialAccountsApi.listSocialAccounts(id))
      )
      return results.flat()
    },
  })

  // Selected social accounts selection state
  const [selectedSocialAccountIds, setSelectedSocialAccountIds] = useState<string[]>([])

  // On edit mode, load the accounts
  useEffect(() => {
    if (isOpen) {
      if (editPost && editPost.platformTargets) {
        const zernioIds = editPost.platformTargets
          .map(t => t.zernioAccountId || (t as any).accountId)
          .filter(Boolean) as string[]
        if (socialAccounts.length > 0 && zernioIds.length > 0) {
          const localIds = zernioIds
            .map(zid => socialAccounts.find(a => a.externalAccountId === zid)?.id)
            .filter(Boolean) as string[]
          setSelectedSocialAccountIds(localIds)
        } else {
          setSelectedSocialAccountIds(zernioIds)
        }
      } else {
        setSelectedSocialAccountIds([])
      }
    }
  }, [isOpen, editPost, socialAccounts])

  // On edit mode, load media
  useEffect(() => {
    const editPostMedia = editPost?.media || editPost?.mediaItems
    if (isOpen && editPostMedia && editPostMedia.length > 0) {
      const loadedMedia = editPostMedia.map(item => ({
        id: shortId(),
        url: item.url,
        type: (item.type === 'video' ? 'video' : 'image') as 'image' | 'video',
        name: item.filename || item.url.split('/').pop() || 'media',
        mimeType: item.mimeType,
      }))
      mediaHook.setMedia(loadedMedia)
    } else if (isOpen && !editPost) {
      mediaHook.resetMedia()
    }
  }, [isOpen, editPost])

  // Platform Grouping
  const [platformGroups, setPlatformGroups] = useState<{ name: string; accountIds: string[] }[]>([])
  const [isCreatingGroup, setIsCreatingGroup] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')

  useEffect(() => {
    try {
      const saved = localStorage.getItem('syncra_platform_groups')
      if (saved) {
        setPlatformGroups(JSON.parse(saved))
      }
    } catch (e) {
      console.error('Failed to load platform groups', e)
    }
  }, [])

  const savePlatformGroup = (name: string) => {
    if (!name.trim()) return
    if (selectedSocialAccountIds.length === 0) {
      onToast?.({ message: 'Select at least one platform to save as a group.', type: 'error' })
      return
    }
    const newGroup = { name: name.trim(), accountIds: [...selectedSocialAccountIds] }
    const nextGroups = [...platformGroups.filter(g => g.name !== name.trim()), newGroup]
    setPlatformGroups(nextGroups)
    localStorage.setItem('syncra_platform_groups', JSON.stringify(nextGroups))
    setIsCreatingGroup(false)
    setNewGroupName('')
    onToast?.({ message: `Group "${name}" saved!`, type: 'success' })
  }

  const deletePlatformGroup = (name: string) => {
    const nextGroups = platformGroups.filter(g => g.name !== name)
    setPlatformGroups(nextGroups)
    localStorage.setItem('syncra_platform_groups', JSON.stringify(nextGroups))
    onToast?.({ message: `Group "${name}" deleted.`, type: 'success' })
  }

  const selectPlatformGroup = (group: { name: string; accountIds: string[] }) => {
    setSelectedSocialAccountIds(prev => {
      const merged = new Set([...prev, ...group.accountIds])
      return Array.from(merged)
    })
  }

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

  const [activePlatforms, setActivePlatforms] = useState<Platform[]>([])
  const [activeTab, setActiveTab] = useState<Platform>('tiktok')
  
  // Custom Platform settings & Overrides
  const [mainContent, setMainContent] = useState('')
  const [facebookFirstComment, setFacebookFirstComment] = useState('')
  const [facebookCustomCaption, setFacebookCustomCaption] = useState('')
  const [tiktokDraft, setTiktokDraft] = useState(false)
  const [tiktokCustomCaption, setTiktokCustomCaption] = useState('')
  const [tiktokPhotoDescription, setTiktokPhotoDescription] = useState('')
  const [captionsByPlatform, setCaptionsByPlatform] = useState<PlatformCaptionMap>({
    tiktok: '', instagram: '', facebook: '', twitter: '', linkedin: '', youtube: '', pinterest: ''
  })
  const [platformTimeOverrides, setPlatformTimeOverrides] = useState<Record<string, string>>({})
  const [timezone, setTimezone] = useState('Bangkok')

  // Per-platform advanced settings (PlatformSpecificForm)
  const [platformSpecificData, setPlatformSpecificData] = useState<AllPlatformData>({})

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
      let nextContent = ''
      let nextCaptions = { tiktok: '', instagram: '', facebook: '', twitter: '', linkedin: '', youtube: '', pinterest: '' } as PlatformCaptionMap
      let initPlatforms: Platform[] = []
      let initSchMode = false
      let initSchTime = ''
      let loadedFromDraft = false
      let initialPlatformSpecificData: AllPlatformData = {}

      if (editPost) {
        nextContent = editPost.caption
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

        if (editPost.platformTargets) {
          editPost.platformTargets.forEach(target => {
            if (target.platformSpecificData) {
              const platformKey = target.platform.toLowerCase() as keyof AllPlatformData
              initialPlatformSpecificData[platformKey] = target.platformSpecificData
            }
          })
        }

        const editPostMedia = editPost.media || editPost.mediaItems
        if (editPostMedia && editPostMedia.length > 0) {
          const loadedMedia = editPostMedia.map(item => ({
            id: shortId(),
            url: item.url,
            type: (item.type === 'video' ? 'video' : 'image') as 'image' | 'video',
            name: item.filename || item.url.split('/').pop() || 'media',
          }))
          mediaHook.setMedia(loadedMedia)
        } else if (editPost.image) {
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
            if (parsed.mainContent) nextContent = parsed.mainContent
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
          nextContent = initialContent
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

      setMainContent(nextContent)
      setCaptionsByPlatform(nextCaptions)
      setPlatformSpecificData(initialPlatformSpecificData)
      setTouched({ tiktok: false, instagram: false, facebook: false, twitter: false, linkedin: false, youtube: false, pinterest: false })
      setScheduleMode(initSchMode)
      setScheduleTime(initSchTime)
      setPublishingTab(editPost?.status === 'draft' ? 'draft' : initSchMode ? 'schedule' : 'now')
      setActivePlatforms(initPlatforms.length > 0 ? initPlatforms : [])
      setActiveTab(initPlatforms.length > 0 ? initPlatforms[0] : 'tiktok')

      initialSnapshotRef.current = JSON.stringify({
        mainContent: nextContent,
        captionsByPlatform: loadedFromDraft || editPost ? nextCaptions : { tiktok: '', instagram: '', facebook: '', twitter: '', linkedin: '', youtube: '', pinterest: '' },
        media: mediaHook.media,
        activePlatforms: initPlatforms.length > 0 ? initPlatforms : [],
        scheduleMode: initSchMode,
        scheduleTime: initSchTime
      })
    }, 0)

    didInitRef.current = true
  }, [isOpen, initialContent, initialDate, showUnsavedDialog, editPost, mediaHook])

  const getResolvedContentForPlatform = useCallback((platform: Platform) => {
    if (platform === 'facebook') {
      return facebookCustomCaption.trim() ? facebookCustomCaption : mainContent
    }
    if (platform === 'tiktok') {
      const hasImages = mediaHook.media.some(m => m.type === 'image')
      if (hasImages) {
        return tiktokPhotoDescription.trim() ? tiktokPhotoDescription : mainContent
      } else {
        return tiktokCustomCaption.trim() ? tiktokCustomCaption : mainContent
      }
    }
    const override = captionsByPlatform[platform]
    return override.trim() ? override : mainContent
  }, [mainContent, facebookCustomCaption, tiktokPhotoDescription, tiktokCustomCaption, captionsByPlatform, mediaHook.media])

  const caption = useMemo(() => {
    return getResolvedContentForPlatform(activeTab)
  }, [activeTab, getResolvedContentForPlatform])

  const setActiveCaption = (next: string) => {
    setMainContent(next)
    setTouched(prev => ({ ...prev, [activeTab]: true }))
  }

  const currentSnapshot = JSON.stringify({
    mainContent,
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
    setActivePlatforms([])
    setActiveTab('tiktok')
    setShowUnsavedDialog(false)
    setMainContent('')
    setFacebookFirstComment('')
    setFacebookCustomCaption('')
    setTiktokDraft(false)
    setTiktokCustomCaption('')
    setTiktokPhotoDescription('')
    setPlatformTimeOverrides({})
    setIsCreatingGroup(false)
    setNewGroupName('')
    setPlatformSpecificData({})
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

  const handleDraft = async (): Promise<boolean> => {
    if (activeWorkspace) {
      try {
        const wsId = activeWorkspace.id
        const content = mainContent
        const title = content.slice(0, 50) || 'Untitled Draft'

        // Upload any local media to Wasabi first, then use public URLs
        const resolvedMedia = await uploadPendingMedia(wsId)

        const mediaItems = resolvedMedia.map(m => ({
          url: m.url,
          type: m.type,
          filename: m.name,
          mimeType: m.mimeType || m.file?.type
        }))

        const platformContents = selectedSocialAccountIds.map(id => {
          const account = socialAccounts.find(a => a.id === id)
          return {
            platform: account?.platform || 'unknown',
            caption: getResolvedContentForPlatform((account?.platform || 'tiktok') as Platform)
          }
        })

        await postsApi.createZernioPost(wsId, {
          postId: editPost?.zernioPostId,
          status: editPost?.status,
          title,
          content,
          socialAccountIds: selectedSocialAccountIds,
          scheduledAtUtc: undefined,
          publishNow: false,
          isDraft: true,
          mediaItems,
          platformContents,
          platformSpecificData,
          tiktokSettings: prepareTikTokSettings(platformSpecificData.tiktok)
        })

        onToast?.({ message: 'Draft saved successfully on Zernio!', type: 'success' })

        void queryClient.invalidateQueries({ queryKey: ['calendar-posts'] })
        void queryClient.invalidateQueries({ queryKey: ['dashboard-recent-posts'] })
        void queryClient.invalidateQueries({ queryKey: ['posts'] })

        localStorage.removeItem('syncra_draft')
        initialSnapshotRef.current = currentSnapshot
        
        reset()
        onClose()
        return true
      } catch (err) {
        onToast?.({ message: 'Failed to save draft. Please try again.', type: 'error' })
        return false
      }
    }

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
    const platformsToSave = derivedActivePlatforms.length > 0 ? derivedActivePlatforms : activePlatforms

    if (isEditMode && editPost) {
      const platform = platformsToSave[0] || editPost.platform
      const cap = getResolvedContentForPlatform(platform)
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
      platformsToSave.forEach(platform => {
        const platformCaption = getResolvedContentForPlatform(platform)
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

    // Check if any selected platform fails validation (e.g. TikTok has no media)
    const activeAccounts = socialAccounts.filter(a => a.isActive)
    const selectedAccounts = activeAccounts.filter(a => selectedSocialAccountIds.includes(a.id))
    for (const acc of selectedAccounts) {
      const err = getPlatformValidationError(acc.platform as Platform, mediaHook.media)
      if (err) {
        onToast?.({ message: `Validation failed: ${err}`, type: 'error' })
        return
      }
    }

    setShowPublishConfirmDialog(true)
  }

  const confirmSchedule = async () => {
    if (activeWorkspace) {
      const publishNow = publishingTab === 'now'
      const isDraft = publishingTab === 'draft'

      // Group selected accounts by workspace ID
      const accountsByWorkspace: Record<string, string[]> = {}
      if (selectedSocialAccountIds.length > 0) {
        selectedSocialAccountIds.forEach(id => {
          const account = socialAccounts.find(a => a.id === id)
          if (!account) return
          const ws = workspaces.find(w => w.zernioProfileId === account.zernioProfileId)
          const wsId = ws?.id || activeWorkspace.id
          if (wsId) {
            if (!accountsByWorkspace[wsId]) accountsByWorkspace[wsId] = []
            accountsByWorkspace[wsId].push(id)
          }
        })
      } else {
        accountsByWorkspace[activeWorkspace.id] = []
      }

      let resolvedScheduleTime = scheduleTime
      if (publishingTab === 'schedule' && !resolvedScheduleTime) {
        const tomorrow = new Date()
        tomorrow.setDate(tomorrow.getDate() + 1)
        const year = tomorrow.getFullYear()
        const month = String(tomorrow.getMonth() + 1).padStart(2, '0')
        const day = String(tomorrow.getDate()).padStart(2, '0')
        resolvedScheduleTime = `${year}-${month}-${day}T09:00`
      }

      try {
        const promises: Promise<any>[] = []

        // Upload all pending local media ONCE, then reuse the resolved URLs
        const resolvedMedia = await uploadPendingMedia(activeWorkspace.id)
        
        Object.entries(accountsByWorkspace).forEach(([wsId, accountIds]) => {
          if (accountIds.length === 0) {
            // Draft post with no channels selected
            const content = mainContent
            const title = content.slice(0, 50) || 'Untitled Draft'
            const mediaItems = resolvedMedia.map(m => ({
              url: m.url,
              type: m.type,
              filename: m.name
            }))
            promises.push(
              postsApi.createZernioPost(wsId, {
                postId: editPost?.zernioPostId,
                status: editPost?.status,
                title,
                content,
                socialAccountIds: [],
                scheduledAtUtc: undefined,
                publishNow: false,
                isDraft: true,
                mediaItems
              })
            )
          } else {
            // Group accounts in this workspace by schedule time and content overrides
            const groupsByKey: Record<string, { ids: string[]; scheduledAtUtc?: string; content: string }> = {}
            
            accountIds.forEach(accountId => {
              const account = socialAccounts.find(a => a.id === accountId)
              if (!account) return
              
              const overrideTime = platformTimeOverrides[accountId]
              const scheduledAtUtc = (publishingTab === 'schedule' || publishingTab === 'draft')
                ? (overrideTime ? getUtcString(overrideTime, timezone) : (resolvedScheduleTime ? getUtcString(resolvedScheduleTime, timezone) : undefined))
                : undefined

              const finalScheduledAtUtc = isDraft ? undefined : scheduledAtUtc
              const content = getResolvedContentForPlatform(account.platform as Platform)
              
              // Build unique key for this configuration
              const key = `${finalScheduledAtUtc ?? 'now'}_${content}`
              if (!groupsByKey[key]) {
                groupsByKey[key] = {
                  ids: [],
                  scheduledAtUtc: finalScheduledAtUtc,
                  content
                }
              }
              groupsByKey[key].ids.push(accountId)
            })
            
            // Make create post requests
            const mediaItems = resolvedMedia.map(m => ({
              url: m.url,
              type: m.type,
              filename: m.name,
              mimeType: m.mimeType || m.file?.type
            }))

            Object.values(groupsByKey).forEach(({ ids, scheduledAtUtc, content }) => {
              const title = content.slice(0, 50) || 'Untitled Post'
              
              const platformContents = ids.map(id => {
                const account = socialAccounts.find(a => a.id === id)
                return {
                  platform: account?.platform || 'unknown',
                  caption: getResolvedContentForPlatform((account?.platform || 'tiktok') as Platform)
                }
              })

              promises.push(
                postsApi.createZernioPost(wsId, {
                  postId: editPost?.zernioPostId,
                  status: editPost?.status,
                  title,
                  content,
                  socialAccountIds: ids,
                  scheduledAtUtc,
                  publishNow: isDraft ? false : (scheduledAtUtc === undefined || publishNow),
                  isDraft,
                  mediaItems,
                  platformContents,
                  platformSpecificData,
                  tiktokSettings: prepareTikTokSettings(platformSpecificData.tiktok)
                })
              )
            })
          }
        })

        await Promise.all(promises)

        onToast?.({
          message: `Post ${isDraft ? 'saved as draft' : (publishNow ? 'published' : 'scheduled')} successfully on Zernio!`,
          type: 'success'
        })

        void queryClient.invalidateQueries({ queryKey: ['calendar-posts'] })
        void queryClient.invalidateQueries({ queryKey: ['dashboard-recent-posts'] })
        void queryClient.invalidateQueries({ queryKey: ['posts'] })

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
      const cap = getResolvedContentForPlatform(platform)
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
        const platformCaption = getResolvedContentForPlatform(platform)
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
      const result = await postsApi.getPosts(workspaceId, { status: 'published', pageSize: 10 })
      const lastPost = result.items.find(p => p.content)
      if (lastPost) {
        const text = lastPost.content || ''
        setMainContent(text)
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
      selectedWorkspaceIds,
      platformGroups,
      isCreatingGroup,
      newGroupName,
      facebookFirstComment,
      facebookCustomCaption,
      tiktokDraft,
      tiktokCustomCaption,
      tiktokPhotoDescription,
      platformTimeOverrides,
      timezone,
      mainContent,
      platformSpecificData,
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
      setSelectedWorkspaceIds,
      savePlatformGroup,
      deletePlatformGroup,
      selectPlatformGroup,
      setIsCreatingGroup,
      setNewGroupName,
      setMainContent,
      setFacebookFirstComment,
      setFacebookCustomCaption,
      setTiktokDraft,
      setTiktokCustomCaption,
      setTiktokPhotoDescription,
      setPlatformTimeOverrides,
      setTimezone,
      setPlatformSpecificData,
    }
  }
}

export type UseCreatePostStateReturn = ReturnType<typeof useCreatePostState>
