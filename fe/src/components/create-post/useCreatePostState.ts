import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useWorkspace } from '../../context/WorkspaceContext'
import { useCreatePostMedia } from '../../hooks/useCreatePostMedia'
import { useCreatePostAI } from '../../hooks/useCreatePostAI'
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query'
import { shortId } from '../../utils/shortId'
import { postsApi } from '../../api/posts'
import { socialAccountsApi } from '../../api/socialAccounts'
import { PLATFORMS, type Platform, type Tone, type PlatformCaptionMap, type CreatePostModalProps } from './types'
import type { AllPlatformData } from './PlatformSpecificForm'
import type { Profile } from '../../api/types'
import api from '../../lib/axios'

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
  if (platform === 'facebook') {
    const hasImage = media.some(m => m.type === 'image')
    const hasVideo = media.some(m => m.type === 'video')
    if (hasImage && hasVideo) {
      return 'Facebook posts cannot mix videos and images. Please use either all images or all videos.'
    }
  }
  return null
}

function extractErrorMessage(err: any, defaultMsg: string): string {
  if (!err) return defaultMsg;
  const apiMessage = err.response?.data?.message || err.message;
  if (!apiMessage) return defaultMsg;

  let finalMessage = apiMessage;

  try {
    const errorJsonMatch = apiMessage.match(/Error:\s*(\{.*\})/);
    if (errorJsonMatch && errorJsonMatch[1]) {
      const parsed = JSON.parse(errorJsonMatch[1]);
      if (parsed && parsed.error) {
        finalMessage = parsed.error;
      }
    }
  } catch (e) {
    // Ignore JSON parsing errors
  }

  if (finalMessage === apiMessage) {
    const errorPropMatch = apiMessage.match(/"error"\s*:\s*"([^"]+)"/);
    if (errorPropMatch && errorPropMatch[1]) {
      finalMessage = errorPropMatch[1];
    }
  }

  return finalMessage.replace(/zernio/gi, (match: string) => {
    if (match === 'ZERNIO') return 'SYNCRA';
    if (match.toLowerCase() === 'zernio') {
      return match[0] === 'Z' ? 'Syncra' : 'syncra';
    }
    return 'Syncra';
  });
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
  const { isOpen, onClose, onToast, initialContent, initialMedia, initialPlatform, initialDate, editPost } = props
  const { user } = useAuth()

  const isEditMode = !!editPost
  const { activeWorkspace, workspaces, activeProfile } = useWorkspace()
  const workspaceId = activeWorkspace?.id

  const mediaHook = useCreatePostMedia()
  const aiHook = useCreatePostAI()
  const queryClient = useQueryClient()

  const uploadPendingMedia = useCallback(async (wsId: string) => {
    const resolved = await Promise.all(
      mediaHook.media.map(async (m) => {
        if (!m.file && !m.url.startsWith('blob:') && !m.url.startsWith('data:')) {
          return m
        }
        if (!m.file) {
          throw new Error(`Media item "${m.name}" has a local URL but no File object — cannot upload.`)
        }
        const { mediaApi } = await import('../../api/media')
        const uploadResult = await mediaApi.uploadMedia(wsId, m.file)
        return { ...m, url: uploadResult.publicUrl, mimeType: uploadResult.mimeType, file: undefined }
      })
    )
    return resolved
  }, [mediaHook.media])

  // Selected profiles state
  const [selectedProfileIds, setSelectedProfileIds] = useState<string[]>([])

  useEffect(() => {
    if (isOpen && activeProfile && selectedProfileIds.length === 0) {
      setSelectedProfileIds([activeProfile.id])
    }
  }, [isOpen, activeProfile])

  // Fetch profiles for all workspaces
  const { data: allProfilesMap = {} } = useQuery({
    queryKey: ['profiles-all-workspaces', workspaces],
    enabled: workspaces.length > 0,
    queryFn: async () => {
      const results = await Promise.all(
        workspaces.map(async (ws) => {
          const res = await api.get<Profile[]>('profiles', {
            headers: { 'X-Workspace-Id': ws.id }
          })
          return { workspaceId: ws.id, profiles: res.data }
        })
      )
      return results.reduce<Record<string, Profile[]>>((acc, item) => {
        acc[item.workspaceId] = item.profiles
        return acc
      }, {})
    }
  })

  // Fetch social accounts tagged with workspaceId and profileId
  const { data: socialAccounts = [], isFetched } = useQuery({
    queryKey: ['social-accounts-multiple', selectedProfileIds, allProfilesMap],
    enabled: selectedProfileIds.length > 0 && Object.keys(allProfilesMap).length > 0,
    queryFn: async () => {
      const results = await Promise.all(
        selectedProfileIds.map(async (profileId) => {
          // Find workspace ID for this profile
          let wsId = ''
          for (const [wId, wsProfiles] of Object.entries(allProfilesMap)) {
            if (wsProfiles.some(p => p.id === profileId)) {
              wsId = wId
              break
            }
          }
          if (!wsId) {
            wsId = activeWorkspace?.id || ''
          }
          if (!wsId) return []
          const accounts = await socialAccountsApi.listSocialAccounts(wsId, profileId)
          return accounts.map(a => ({ ...a, workspaceId: wsId, profileId }))
        })
      )
      return results.flat()
    },
  })

  // Selected social accounts state
  const [selectedSocialAccountIds, setSelectedSocialAccountIds] = useState<string[]>([])
  const didInitAccountsRef = useRef(false)

  // Load account selections in edit mode or initialPlatform
  useEffect(() => {
    if (!isOpen) {
      didInitAccountsRef.current = false
      return
    }

    if (didInitAccountsRef.current) return

    if (isFetched) {
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
      } else if (initialPlatform) {
        const normPlatform = initialPlatform.toLowerCase()
        const mappedPlatform = normPlatform === 'x' ? 'twitter' as const : normPlatform
        
        // Find active social accounts matching the initial platform
        const matchingAccounts = socialAccounts
          .filter(a => a.isActive && a.platform.toLowerCase() === mappedPlatform)
          .map(a => a.id)
        
        setSelectedSocialAccountIds(matchingAccounts)
      } else {
        setSelectedSocialAccountIds([])
      }
      didInitAccountsRef.current = true
    }
  }, [isOpen, editPost, socialAccounts, isFetched, initialPlatform])

  // Load media in edit mode or initial media pass-through
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
    } else if (isOpen && initialMedia && initialMedia.length > 0) {
      const loadedMedia = initialMedia.map(item => ({
        id: shortId(),
        url: item.url,
        type: item.type,
        name: item.name || 'media',
      }))
      mediaHook.setMedia(loadedMedia)
    } else if (isOpen && !editPost) {
      mediaHook.resetMedia()
    }
  }, [isOpen, editPost, initialMedia])

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
    onError: (err: any) => {
      const msg = extractErrorMessage(err, 'Failed to retry post.')
      onToast?.({ message: msg, type: 'error' })
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
    onError: (err: any) => {
      const msg = extractErrorMessage(err, 'Failed to delete post.')
      onToast?.({ message: msg, type: 'error' })
    }
  })

  const [activePlatforms, setActivePlatforms] = useState<Platform[]>([])
  const [activeTab, setActiveTab] = useState<Platform>('tiktok')

  // Main input fields
  const [mainContent, setMainContent] = useState('')
  const [facebookFirstComment, setFacebookFirstComment] = useState('')
  const [tiktokDraft, setTiktokDraft] = useState(false)
  const [tiktokPhotoDescription, setTiktokPhotoDescription] = useState('')
  const [captionsByPlatform, setCaptionsByPlatform] = useState<PlatformCaptionMap>({
    tiktok: '', facebook: '', linkedin: '', youtube: ''
  })
  const [platformTimeOverrides, setPlatformTimeOverrides] = useState<Record<string, string>>({})
  const [timezone, setTimezone] = useState('Bangkok')

  // Platform specific settings data
  const [platformSpecificData, setPlatformSpecificData] = useState<AllPlatformData>({})

  const [touched, setTouched] = useState<Record<Platform, boolean>>({
    tiktok: false, facebook: false, linkedin: false, youtube: false
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
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  useEffect(() => {
    setSubmitError(null)
  }, [mainContent, selectedSocialAccountIds, mediaHook.media])

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

        if (initialPlatform) {
          const normPlatform = initialPlatform.toLowerCase();
          const mappedPlatform = normPlatform === 'x' ? 'twitter' : normPlatform;
          if (['tiktok', 'facebook', 'linkedin', 'youtube'].includes(mappedPlatform)) {
            initPlatforms = [mappedPlatform as Platform]
          }
        }
      }

      setMainContent(nextContent)
      setCaptionsByPlatform(nextCaptions)
      setPlatformSpecificData(initialPlatformSpecificData)
      setTouched({ tiktok: false, facebook: false, linkedin: false, youtube: false })
      setScheduleMode(initSchMode)
      setScheduleTime(initSchTime)
      setPublishingTab(editPost?.status === 'draft' ? 'draft' : initSchMode ? 'schedule' : 'now')
      setActivePlatforms(initPlatforms.length > 0 ? initPlatforms : [])
      setActiveTab(initPlatforms.length > 0 ? initPlatforms[0] : 'tiktok')

      initialSnapshotRef.current = JSON.stringify({
        mainContent: nextContent,
        captionsByPlatform: loadedFromDraft || editPost ? nextCaptions : { tiktok: '', facebook: '', linkedin: '', youtube: '' },
        media: mediaHook.media,
        activePlatforms: initPlatforms.length > 0 ? initPlatforms : [],
        scheduleMode: initSchMode,
        scheduleTime: initSchTime
      })
    }, 0)

    didInitRef.current = true
  }, [isOpen, initialContent, initialDate, showUnsavedDialog, editPost, mediaHook])

  const getResolvedContentForPlatform = useCallback((platform: Platform) => {
    if (platform === 'tiktok') {
      const hasImages = mediaHook.media.some(m => m.type === 'image')
      if (hasImages) {
        return tiktokPhotoDescription.trim() ? tiktokPhotoDescription : mainContent
      }
    }
    const override = captionsByPlatform[platform]
    return override.trim() ? override : mainContent
  }, [mainContent, tiktokPhotoDescription, captionsByPlatform, mediaHook.media])

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
    setCaptionsByPlatform({ tiktok: '', instagram: '', facebook: '', twitter: '', linkedin: '', youtube: '', pinterest: '' })
    setTiktokDraft(false)
    setTiktokPhotoDescription('')
    setPlatformTimeOverrides({})
    setIsCreatingGroup(false)
    setNewGroupName('')
    setPlatformSpecificData({})
    initialSnapshotRef.current = null
    didInitRef.current = false
    didInitAccountsRef.current = false
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

  const submitPost = async (isDraft: boolean): Promise<boolean> => {
    if (!activeWorkspace) return false
    if (editPost?.isSplitVideoPost) {
      onToast?.({
        message: 'This post targets multiple platforms (split video post workaround) and cannot be edited. Please delete and recreate.',
        type: 'error'
      })
      return false
    }
    setIsSubmitting(true)
    setSubmitError(null)
    try {
      const wsId = activeWorkspace.id

      // 1. Upload pending media
      const resolvedMedia = await uploadPendingMedia(wsId)
      const mediaItems = resolvedMedia.map(m => ({
        url: m.url,
        type: m.type,
        filename: m.name,
        mimeType: m.mimeType || m.file?.type
      }))

      // Resolve carousel card media (upload any pending files, set link to the uploaded URL)
      const { mediaApi } = await import('../../api/media')
      let resolvedPlatformData = platformSpecificData
      const fbCards = platformSpecificData.facebook?.carouselCards
      if (fbCards && fbCards.length > 0) {
        const resolvedCards = await Promise.all(
          fbCards.map(async (card) => {
            if (card.media?.file) {
              const uploadResult = await mediaApi.uploadMedia(wsId, card.media.file)
              return { link: uploadResult.publicUrl, name: card.name, description: card.description }
            }
            if (card.link) {
              return { link: card.link, name: card.name, description: card.description }
            }
            return { link: '', name: card.name, description: card.description }
          })
        )
        resolvedPlatformData = {
          ...platformSpecificData,
          facebook: {
            ...platformSpecificData.facebook,
            carouselCards: resolvedCards,
          }
        }
      }

      // Resolve TikTok video cover media
      if (resolvedPlatformData.tiktok?.videoCoverMedia?.file) {
        const uploadResult = await mediaApi.uploadMedia(wsId, resolvedPlatformData.tiktok.videoCoverMedia.file)
        resolvedPlatformData = {
          ...resolvedPlatformData,
          tiktok: {
            ...resolvedPlatformData.tiktok,
            videoCoverImageUrl: uploadResult.publicUrl,
            videoCoverMedia: undefined
          }
        }
      }

      // 2. Group selected accounts by profile ID
      const accountsByProfile: Record<string, { wsId: string, accountIds: string[] }> = {}
      if (selectedSocialAccountIds.length > 0) {
        selectedSocialAccountIds.forEach(id => {
          const account = socialAccounts.find(a => a.id === id)
          if (!account) return
          const profileId = (account as any).profileId || activeProfile?.id
          const wsId = account.workspaceId || activeWorkspace?.id
          if (profileId && wsId) {
            if (!accountsByProfile[profileId]) {
              accountsByProfile[profileId] = { wsId, accountIds: [] }
            }
            accountsByProfile[profileId].accountIds.push(id)
          }
        })
      } else {
        if (activeProfile?.id && activeWorkspace?.id) {
          accountsByProfile[activeProfile.id] = { wsId: activeWorkspace.id, accountIds: [] }
        }
      }

      // 3. Resolve schedule time
      const isNow = publishingTab === 'now'
      let resolvedScheduleTime = scheduleTime
      if (publishingTab === 'schedule' && !resolvedScheduleTime) {
        const tomorrow = new Date()
        tomorrow.setDate(tomorrow.getDate() + 1)
        const year = tomorrow.getFullYear()
        const month = String(tomorrow.getMonth() + 1).padStart(2, '0')
        const day = String(tomorrow.getDate()).padStart(2, '0')
        resolvedScheduleTime = `${year}-${month}-${day}T09:00`
      }

      const scheduledAtUtc = (publishingTab === 'schedule' || publishingTab === 'draft') && resolvedScheduleTime
        ? getUtcString(resolvedScheduleTime, timezone)
        : undefined

      const publishNow = isDraft ? false : (scheduledAtUtc === undefined || isNow)

      // 4. Send requests for all selected profiles
      const promises = Object.entries(accountsByProfile).map(([profileId, { wsId, accountIds }]) => {
        const content = mainContent
        const title = content.slice(0, 50) || 'Untitled Post'

        const platformContents = accountIds.map(id => {
          const account = socialAccounts.find(a => a.id === id)
          const platform = (account?.platform || 'facebook') as Platform
          return {
            platform,
            caption: getResolvedContentForPlatform(platform)
          }
        })

        return postsApi.createZernioPost(wsId, {
          postId: editPost?.zernioPostId,
          status: editPost?.status,
          title,
          content,
          socialAccountIds: accountIds,
          scheduledAtUtc: isDraft ? undefined : scheduledAtUtc,
          publishNow,
          isDraft,
          mediaItems,
          platformContents,
          platformSpecificData: resolvedPlatformData,
          tiktokSettings: prepareTikTokSettings(resolvedPlatformData.tiktok),
          facebookSettings: resolvedPlatformData.facebook,
          profileId // Pass the specific profileId to associate the post with the profile
        })
      })

      await Promise.all(promises)

      // If editing a partial or failed post, trigger retry automatically after updating
      if (editPost && (editPost.status?.toLowerCase() === 'partial' || editPost.status?.toLowerCase() === 'failed') && !isDraft) {
        try {
          await postsApi.retryZernioPost(wsId, editPost.id)
        } catch (retryErr) {
          console.error('Failed to trigger retry for failed platforms:', retryErr)
        }
      }

      onToast?.({
        message: `Post ${isDraft ? 'saved as draft' : (publishNow ? 'published' : 'scheduled')} successfully!`,
        type: 'success'
      })

      void queryClient.invalidateQueries({ queryKey: ['calendar-posts'] })
      void queryClient.invalidateQueries({ queryKey: ['dashboard-recent-posts'] })
      void queryClient.invalidateQueries({ queryKey: ['posts'] })

      localStorage.removeItem('syncra_draft')
      setShowPublishConfirmDialog(false)
      reset()
      if (!createAnother) onClose()
      return true
    } catch (err: any) {
      console.error(err)
      const msg = extractErrorMessage(err, 'Failed to save or schedule post. Please try again.')
      setSubmitError(msg)
      return false
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDraft = () => submitPost(true)
  const confirmSchedule = () => submitPost(false)

  const handleSchedule = () => {
    if (!hasPlatforms) {
      setSubmitError('Please select at least one channel first.')
      return
    }

    const activeAccounts = socialAccounts.filter(a => a.isActive)
    const selectedAccounts = activeAccounts.filter(a => selectedSocialAccountIds.includes(a.id))
    for (const acc of selectedAccounts) {
      const err = getPlatformValidationError(acc.platform as Platform, mediaHook.media)
      if (err) {
        setSubmitError(`Validation failed: ${err}`)
        return
      }
    }

    setSubmitError(null)
    setShowPublishConfirmDialog(true)
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

  const tiktokAccountId = useMemo(() => {
    return selectedSocialAccountIds.find(id => {
      const account = socialAccounts.find(a => a.id === id)
      return account?.platform === 'tiktok'
    })
  }, [selectedSocialAccountIds, socialAccounts])

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
      selectedProfileIds,
      allProfilesMap,
      platformGroups,
      isCreatingGroup,
      newGroupName,
      facebookFirstComment,
      tiktokDraft,
      tiktokPhotoDescription,
      platformTimeOverrides,
      timezone,
      mainContent,
      platformSpecificData,
      isSubmitting,
      tiktokAccountId,
      submitError,
    },
    refs,
    actions: {
      setActivePlatforms, setActiveTab, setCaptionsByPlatform, setTouched,
      setShowPreview, setShowEmoji,
      setCreateAnother, setScheduleMode, setScheduleTime, setShowUnsavedDialog,
      setShowPublishConfirmDialog,
      setIsSubmitting,
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
      setSelectedProfileIds,
      savePlatformGroup,
      deletePlatformGroup,
      selectPlatformGroup,
      setIsCreatingGroup,
      setNewGroupName,
      setMainContent,
      setFacebookFirstComment,
      setTiktokDraft,
      setTiktokPhotoDescription,
      setPlatformTimeOverrides,
      setTimezone,
      setPlatformSpecificData,
    }
  }
}

export type UseCreatePostStateReturn = ReturnType<typeof useCreatePostState>
