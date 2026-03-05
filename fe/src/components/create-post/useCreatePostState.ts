import { useState, useRef, useCallback, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { getMockResults } from '../../data/mockAI'
import type { AIGenerateInput } from '../../data/mockAI'
import { shortId } from '../../utils/shortId'
import { PLATFORMS, type Platform, type Tone, type MediaFile, type PlatformCaptionMap, type CreatePostModalProps } from './types'

export function convertCaptionForPlatform(base: string, platform: Platform, maxChars: number): string {
  const clean = base.trim()
  if (!clean) return ''

  if (clean.length > maxChars) {
    return clean.substring(0, maxChars - 3) + '...'
  }

  return clean
}

export function useCreatePostState(props: CreatePostModalProps) {
  const { isOpen, onClose, onToast, initialContent, initialDate } = props
  const { user } = useAuth()

  const [activePlatforms, setActivePlatforms] = useState<Platform[]>(['TikTok'])
  const [activeTab, setActiveTab] = useState<Platform>('TikTok')

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

  // Using useEffect to initialize state here triggers a warning because it's better to do this
  // without useEffect or at least not synchronously setting state inside.
  // We'll wrap it in a setTimeout to fix the synchronous warning
  useEffect(() => {
    if (!isOpen) {
      didInitRef.current = false
      initialSnapshotRef.current = null
      // Use requestAnimationFrame or setTimeout to delay state update outside synchronous flow
      // or check if it actually needs an update
      if (showUnsavedDialog) {
        requestAnimationFrame(() => setShowUnsavedDialog(false))
      }
      return
    }
    if (didInitRef.current) return

    setTimeout(() => {
      let nextCaptions = { TikTok: '', Instagram: '', Facebook: '', X: '' } as PlatformCaptionMap
      let initPlatforms: Platform[] = ['TikTok']
      let initSchMode = false
      let initSchTime = ''
      let loadedFromDraft = false

      if (!initialContent && !initialDate) {
        try {
          const draftStr = localStorage.getItem('technest_draft')
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
      setActiveTab(initPlatforms.length > 0 ? initPlatforms[0] : 'TikTok')
      setMedia([])

      // Nếu không load từ Draft, snapshot của Caption sẽ luôn trống.
      // Điều này đảm bảo khi có initialContent, trạng thái sẽ bị đánh dấu là Dirty (chưa lưu) ngay lập tức.
      initialSnapshotRef.current = JSON.stringify({
        captionsByPlatform: loadedFromDraft ? nextCaptions : { TikTok: '', Instagram: '', Facebook: '', X: '' },
        media: [],
        activePlatforms: initPlatforms.length > 0 ? initPlatforms : ['TikTok'],
        scheduleMode: initSchMode,
        scheduleTime: initSchTime
      })
    }, 0)

    didInitRef.current = true
  }, [isOpen, initialContent, initialDate, showUnsavedDialog])

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
    setActiveTab('TikTok')
    setAiPrompt('')
    setAiResults([])
    setAiIsGenerating(false)
    setShowUnsavedDialog(false)

    initialSnapshotRef.current = null
    didInitRef.current = false
  }, [])

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

  const handleDraft = (): boolean => {
    if (!hasPlatforms) {
      onToast?.({ message: 'Please select at least one channel first.', type: 'error' })
      return false
    }
    
    const draftData = {
      captionsByPlatform,
      activePlatforms,
      scheduleMode,
      scheduleTime,
    }
    localStorage.setItem('technest_draft', JSON.stringify(draftData))
    
    initialSnapshotRef.current = currentSnapshot
    onToast?.({ message: 'Draft saved successfully.', type: 'success' })
    return true
  }

  const handleSchedule = () => {
    if (!hasPlatforms) {
      onToast?.({ message: 'Please select at least one channel first.', type: 'error' })
      return
    }
    onToast?.({ message: `Post scheduled successfully on ${activePlatforms.join(', ')}!`, type: 'success' })
    localStorage.removeItem('technest_draft')
    
    if (createAnother) {
      reset()
    } else {
      reset()
      onClose()
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
      const url = URL.createObjectURL(file)
      const type = file.type.startsWith('video') ? 'video' : 'image'
      setMedia(prev => [...prev, { id: shortId(), url, type, name: file.name }])
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
      dragId, dragOverId, aiPrompt, aiResults, aiIsGenerating, editingId,
      user, caption, charLimit, overLimit, hasPlatforms, activeP,
      currentSnapshot
    },
    refs,
    actions: {
      setActivePlatforms, setActiveTab, setCaptionsByPlatform, setTouched,
      setShowAI, setShowPreview, setShowEmoji, setMedia, setDragOver,
      setCreateAnother, setScheduleMode, setScheduleTime, setShowUnsavedDialog,
      setDragId, setDragOverId, setAiPrompt, setAiResults, setAiIsGenerating,
      setEditingId, setActiveCaption, reset, handleAttemptClose, handleDraft,
      handleSchedule, togglePlatform, handleFiles, onDrop, removeMedia,
      handleDragStart, handleDragOver, handleDropOnThumb, handleDragEnd,
      handleReplaceVideo, handleReplaceFile, handleEditorSave, insertAtCursor,
      handleGenerateAI, applyAISuggestion
    }
  }
}

export type UseCreatePostStateReturn = ReturnType<typeof useCreatePostState>