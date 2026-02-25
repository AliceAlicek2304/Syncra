import { useState, useRef, useCallback, useEffect } from 'react'
import {
  X, Sparkles, Eye, Smile, Hash, Settings2,
  Heart, MessageCircle, Share2, Repeat2, BarChart2,
  ThumbsUp, BookMarked, ImageIcon, Search, Music2,
  RotateCcw, RotateCw, Crop, Check, FlipHorizontal,
  Signal, Wifi, Battery, Home, Users, Inbox, User,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { getMockResults } from '../data/mockAI'
import type { ToastItem } from './Toast'
import styles from './CreatePostModal.module.css'

// ── Types ──────────────────────────────────────────────
type Platform = 'TikTok' | 'Instagram' | 'Facebook' | 'X'
type Tone     = 'default' | 'professional' | 'casual'

interface MediaFile { id: string; url: string; type: 'image' | 'video'; name: string }

interface Props {
  isOpen   : boolean
  onClose  : () => void
  onToast? : (t: Omit<ToastItem, 'id'>) => void
}

// ── Constants ──────────────────────────────────────────
const PLATFORMS: { id: Platform; label: string; className: string; maxChars: number }[] = [
  { id: 'TikTok',    label: 'TikTok',    className: styles.chipTikTok, maxChars: 2200 },
  { id: 'Instagram', label: 'Instagram', className: styles.chipIG,     maxChars: 2200 },
  { id: 'Facebook',  label: 'Facebook',  className: styles.chipFB,     maxChars: 2200 },
  { id: 'X',         label: 'Twitter/X', className: styles.chipX,      maxChars: 280  },
]

const PLATFORM_ICONS: Record<Platform, string> = {
  TikTok:    '♪',
  Instagram: '📸',
  Facebook:  'f',
  X:         '𝕏',
}

const PLATFORM_BADGE_CLASS: Record<Platform, string> = {
  TikTok:    styles.badgeTikTok,
  Instagram: styles.badgeIG,
  Facebook:  styles.badgeFB,
  X:         styles.badgeX,
}

const COMMON_EMOJIS = ['😊','🔥','💡','🚀','✅','💬','👇','❤️','🎯','💪','📊','🌟','😂','👏','🙌','💼','🎉','✨','📱','💰']
const HASH_TAGS = ['#contentcreator','#viral','#trending','#socialmedia','#growth','#marketing']

// ── Helper ─────────────────────────────────────────────
function shortId() { return Math.random().toString(36).slice(2, 9) }

// ── Crop presets ───────────────────────────────────────
const CROP_PRESETS = [
  { label: 'Free', ratio: null },
  { label: '1:1',  ratio: 1 },
  { label: '4:3',  ratio: 4 / 3 },
  { label: '16:9', ratio: 16 / 9 },
  { label: '9:16', ratio: 9 / 16 },
]

// ── Image Editor Panel ────────────────────────────────
interface EditorPanelProps { src: string; onSave: (blob: Blob) => void; onCancel: () => void }
function ImageEditorPanel({ src, onSave, onCancel }: EditorPanelProps) {
  const [rotation,   setRotation]  = useState(0)
  const [flipH,      setFlipH]     = useState(false)
  const [cropStart,  setCropStart] = useState<{ x: number; y: number } | null>(null)
  const [cropEnd,    setCropEnd]   = useState<{ x: number; y: number } | null>(null)
  const [dragging,   setDragging]  = useState(false)
  const [activeCrop, setActiveCrop] = useState<string>('Free')
  const imgRef     = useRef<HTMLImageElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)

  const rotateBy  = (dir: 1 | -1) => setRotation(r => (r + dir * 90 + 360) % 360)
  const resetEditor = () => { setRotation(0); setFlipH(false); setCropStart(null); setCropEnd(null); setActiveCrop('Free') }

  const applyCropPreset = (label: string, ratio: number | null) => {
    setActiveCrop(label)
    if (!ratio || !overlayRef.current) { setCropStart(null); setCropEnd(null); return }
    const { width: w, height: h } = overlayRef.current.getBoundingClientRect()
    const boxH = ratio < 1 ? w * (1 / ratio) : w / ratio
    const clampH = Math.min(boxH, h)
    const clampW = clampH * ratio
    const x = (w - clampW) / 2
    const y = (h - clampH) / 2
    setCropStart({ x, y })
    setCropEnd({ x: x + clampW, y: y + clampH })
  }

  const getRect = () => {
    if (!cropStart || !cropEnd) return null
    const x = Math.min(cropStart.x, cropEnd.x)
    const y = Math.min(cropStart.y, cropEnd.y)
    const w = Math.abs(cropEnd.x - cropStart.x)
    const h = Math.abs(cropEnd.y - cropStart.y)
    return (w > 8 && h > 8) ? { x, y, w, h } : null
  }

  const onMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = overlayRef.current!.getBoundingClientRect()
    setCropStart({ x: e.clientX - rect.left, y: e.clientY - rect.top })
    setCropEnd(null)
    setDragging(true)
    setActiveCrop('Free')
  }
  const onMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!dragging) return
    const rect = overlayRef.current!.getBoundingClientRect()
    setCropEnd({ x: e.clientX - rect.left, y: e.clientY - rect.top })
  }
  const onMouseUp = () => setDragging(false)

  const handleApply = () => {
    const img = imgRef.current
    if (!img) return
    const isRotated90 = rotation === 90 || rotation === 270
    const ow = img.naturalWidth; const oh = img.naturalHeight
    const cw = isRotated90 ? oh : ow; const ch = isRotated90 ? ow : oh
    const canvas = document.createElement('canvas')
    canvas.width = cw; canvas.height = ch
    const ctx = canvas.getContext('2d')!
    ctx.translate(cw / 2, ch / 2)
    ctx.rotate((rotation * Math.PI) / 180)
    if (flipH) ctx.scale(-1, 1)
    ctx.drawImage(img, -ow / 2, -oh / 2)
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    const cropRect = getRect()
    if (cropRect && overlayRef.current) {
      const or = overlayRef.current.getBoundingClientRect()
      const sx = (cropRect.x / or.width)  * cw; const sy = (cropRect.y / or.height) * ch
      const sw = (cropRect.w / or.width)  * cw; const sh = (cropRect.h / or.height) * ch
      const cc = document.createElement('canvas')
      cc.width = Math.max(1, sw); cc.height = Math.max(1, sh)
      cc.getContext('2d')!.drawImage(canvas, -sx, -sy)
      cc.toBlob(b => { if (b) onSave(b) }, 'image/jpeg', 0.92)
      return
    }
    canvas.toBlob(b => { if (b) onSave(b) }, 'image/jpeg', 0.92)
  }

  const imgTransform = [
    `rotate(${rotation}deg)`,
    flipH ? 'scaleX(-1)' : '',
  ].filter(Boolean).join(' ')

  const cropRect = getRect()
  return (
    <div className={styles.editorPanel}>

      {/* ── Image canvas ── */}
      <div
        ref={overlayRef}
        className={styles.editorCanvas}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
      >
        <img
          ref={imgRef}
          src={src}
          alt="edit"
          className={styles.editorImg}
          style={{ transform: imgTransform }}
          draggable={false}
          crossOrigin="anonymous"
        />
        {cropRect && (
          <div
            className={styles.cropOverlay}
            style={{ left: cropRect.x, top: cropRect.y, width: cropRect.w, height: cropRect.h }}
          />
        )}
      </div>

      {/* ── Controls row: crop presets + rotate/flip ── */}
      <div className={styles.editorControls}>
        <div className={styles.editorCropPresets}>
          <Crop size={13} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
          {CROP_PRESETS.map(p => (
            <button
              key={p.label}
              type="button"
              className={`${styles.editorCropBtn} ${activeCrop === p.label ? styles.editorCropBtnActive : ''}`}
              onClick={() => applyCropPreset(p.label, p.ratio)}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className={styles.editorControlsDivider} />
        <div className={styles.editorRotateBtns}>
          <button type="button" className={styles.editorIconBtn} title="Rotate left" onClick={() => rotateBy(-1)}>
            <RotateCcw size={15} />
          </button>
          <button type="button" className={styles.editorIconBtn} title="Rotate right" onClick={() => rotateBy(1)}>
            <RotateCw size={15} />
          </button>
          <button type="button" className={styles.editorIconBtn} title="Flip horizontal" onClick={() => setFlipH(f => !f)}>
            <FlipHorizontal size={15} />
          </button>
          <button type="button" className={styles.editorIconBtn} title="Reset" onClick={resetEditor}>
            Reset
          </button>
        </div>
      </div>

      {/* ── Footer: cancel | hint | apply ── */}
      <div className={styles.editorFooterRow}>
        <button type="button" className={styles.editorCancelBtn} title="Cancel" onClick={onCancel}>
          <X size={18} />
        </button>
        <span className={styles.editorHint}>
          {cropRect ? `${Math.round(cropRect.w)} × ${Math.round(cropRect.h)} px` : 'Drag to select crop area'}
        </span>
        <button type="button" className={styles.editorApplyBtn} title="Apply" onClick={handleApply}>
          <Check size={18} />
        </button>
      </div>

    </div>
  )
}

// getMockResults is imported; it accepts tone param
export default function CreatePostModal({ isOpen, onClose, onToast }: Props) {
  const { user } = useAuth()

  // Platform selection
  const [activePlatforms, setActivePlatforms] = useState<Platform[]>(['TikTok'])
  const [activeTab,       setActiveTab]       = useState<Platform>('TikTok')

  // Composer state
  const [caption, setCaption]             = useState('')
  const [showAI,   setShowAI]             = useState(false)
  const [showPreview, setShowPreview]     = useState(true)
  const [tone,     setTone]               = useState<Tone>('default')
  const [showEmoji, setShowEmoji]         = useState(false)
  const [media,    setMedia]              = useState<MediaFile[]>([])
  const [dragOver, setDragOver]           = useState(false)
  const [createAnother, setCreateAnother] = useState(false)
  const [scheduleMode,  setScheduleMode]  = useState(false)
  const [scheduleTime,  setScheduleTime]  = useState('')
  const [dragId,       setDragId]         = useState<string | null>(null)
  const [dragOverId,   setDragOverId]     = useState<string | null>(null)

  // AI panel state
  const [aiPrompt,      setAiPrompt]      = useState('')
  const [aiResults,     setAiResults]     = useState<Array<{ id: string; type: string; caption: string }>>([])
  const [aiIsGenerating, setAiIsGenerating] = useState(false)
  const [editingId,    setEditingId]      = useState<string | null>(null)

  const fileInputRef       = useRef<HTMLInputElement>(null)
  const replaceInputRef    = useRef<HTMLInputElement>(null)
  const replaceTargetIdRef = useRef<string | null>(null)
  const textareaRef        = useRef<HTMLTextAreaElement>(null)
  const emojiRef     = useRef<HTMLDivElement>(null)

  const activeP = PLATFORMS.find(p => p.id === activeTab) ?? PLATFORMS[0]
  const charLimit = activeP.maxChars
  const overLimit = caption.length > charLimit
  const hasPlatforms = activePlatforms.length > 0

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (editingId) {
        setEditingId(null)
        return
      }
      onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isOpen, onClose, editingId])

  // Close emoji popover on outside click
  useEffect(() => {
    if (!showEmoji) return
    const handler = (e: MouseEvent) => {
      if (emojiRef.current && !emojiRef.current.contains(e.target as Node)) setShowEmoji(false)
    }
    window.addEventListener('mousedown', handler)
    return () => window.removeEventListener('mousedown', handler)
  }, [showEmoji])

  // Make sure activeTab is always a selected platform
  useEffect(() => {
    if (!activePlatforms.includes(activeTab) && activePlatforms.length > 0) {
      setActiveTab(activePlatforms[0])
    }
  }, [activePlatforms, activeTab])

  const togglePlatform = (p: Platform) => {
    setActivePlatforms(prev =>
      prev.includes(p)
        ? prev.filter(x => x !== p)
        : [...prev, p]
    )
  }

  // ── Media handling ─────────────────────────────────
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

  // ── Media controls ─────────────────────────────────
  const removeMedia = (id: string) => {
    setMedia(prev => {
      const item = prev.find(m => m.id === id)
      if (item) URL.revokeObjectURL(item.url)
      return prev.filter(m => m.id !== id)
    })
    setEditingId(prev => (prev === id ? null : prev))
  }

  const handleDragStart = (id: string) => setDragId(id)

  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault()
    setDragOverId(id)
  }

  const handleDropOnThumb = (id: string) => {
    if (!dragId || dragId === id) { setDragId(null); setDragOverId(null); return }
    setMedia(prev => {
      const from = prev.findIndex(m => m.id === dragId)
      const to   = prev.findIndex(m => m.id === id)
      if (from < 0 || to < 0) return prev
      const next = [...prev]
      const [item] = next.splice(from, 1)
      next.splice(to, 0, item)
      return next
    })
    setDragId(null)
    setDragOverId(null)
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

  // ── Emoji & hashtag insert ─────────────────────────
  const insertAtCursor = (text: string) => {
    const el = textareaRef.current
    if (!el) { setCaption(c => c + text); return }
    const start = el.selectionStart ?? caption.length
    const end   = el.selectionEnd   ?? caption.length
    const next  = caption.slice(0, start) + text + caption.slice(end)
    setCaption(next)
    setTimeout(() => {
      el.selectionStart = el.selectionEnd = start + text.length
      el.focus()
    }, 0)
  }

  // ── AI generation ──────────────────────────────────
  const handleGenerateAI = () => {
    if (aiPrompt.trim() === '') return
    setAiIsGenerating(true)
    // Simulate API call delay
    setTimeout(() => {
      setAiResults(getMockResults(tone).slice(0, 4))
      setAiIsGenerating(false)
    }, 800)
  }

  const applyAISuggestion = (suggestion: string) => {
    setCaption(suggestion)
    // Optionally close AI panel after applying
    // setShowAI(false)
  }

  // ── Actions ────────────────────────────────────────
  const reset = () => {
    setEditingId(null)
    setMedia(prev => { prev.forEach(m => URL.revokeObjectURL(m.url)); return [] })
    setCaption('')
    setShowAI(false)
    setShowEmoji(false)
    setScheduleMode(false)
    setScheduleTime('')
    setActivePlatforms(['TikTok','Instagram','Facebook','X'])
    setActiveTab('TikTok')
    setAiPrompt('')
    setAiResults([])
    setAiIsGenerating(false)
  }

  const handleSchedule = () => {
    if (!hasPlatforms) {
      onToast?.({ message: 'Please select at least one channel first.', type: 'error' })
      return
    }
    onToast?.({ message: `Post scheduled successfully on ${activePlatforms.join(', ')}!`, type: 'success' })
    if (createAnother) { reset() } else { reset(); onClose() }
  }

  const handleDraft = () => {
    if (!hasPlatforms) {
      onToast?.({ message: 'Please select at least one channel first.', type: 'error' })
      return
    }
    onToast?.({ message: 'Draft saved successfully.', type: 'success' })
  }

  if (!isOpen) return null

  // ── Render ─────────────────────────────────────────
  const renderPreview = () => {
    const firstImage = media.find(m => m.type === 'image')

    if (activeTab === 'TikTok') return (
      <div className={styles.tiktokCard}>
        {/* background */}
        {firstImage
          ? <img src={firstImage.url} alt="" className={styles.tiktokBg} />
          : <div className={styles.tiktokBgGradient} />
        }
        {/* top bar */}
        <div className={styles.tiktokTopBar}>
          <span className={styles.tiktokTopBarItem}>Following</span>
          <span className={`${styles.tiktokTopBarItem} ${styles.tiktokTopBarActive}`}>For You</span>
          <span className={styles.tiktokTopSearch}><Search size={18} /></span>
        </div>
        {/* right actions */}
        <div className={styles.tiktokActions}>
          <div className={styles.tiktokAvatarAction}>
            <div className={styles.tiktokAvatarRing}>{user?.avatar ?? 'U'}</div>
            <div className={styles.tiktokAvatarPlus}>+</div>
          </div>
          {[
            { icon: <Heart size={26} fill="#fff" color="#fff" />, count: '0' },
            { icon: <MessageCircle size={26} fill="#fff" color="#fff" />, count: '0' },
            { icon: <BookMarked size={26} fill="#fff" color="#fff" />, count: '0' },
            { icon: <Share2 size={26} color="#fff" />, count: 'Share' },
          ].map((a, i) => (
            <div key={i} className={styles.tiktokActionBtn}>{a.icon}<span>{a.count}</span></div>
          ))}
        </div>
        {/* bottom overlay */}
        <div className={styles.tiktokOverlay}>
          <div className={styles.tiktokUser}>@{user?.handle ?? 'you'}</div>
          {caption && <div className={styles.tiktokCaption}>{caption}</div>}
          <div className={styles.tiktokSound}>
            <Music2 size={13} /> original sound · {user?.handle ?? 'you'}
          </div>
        </div>
      </div>
    )

    if (activeTab === 'Instagram') return (
      <div className={styles.igCard}>
        <div className={styles.igHeader}>
          <div className={styles.igAvatar}>{user?.avatar ?? 'U'}</div>
          <span className={styles.igUsername}>{user?.handle ?? 'you'}</span>
        </div>
        <div className={styles.igImage}>
          {firstImage
            ? <img src={firstImage.url} alt="" className={styles.igImageActual} />
            : <span><ImageIcon size={28} style={{color:'var(--text-muted)'}}/></span>
          }
        </div>
        <div className={styles.igActions}>
          <Heart size={18} className={styles.igActionIcon} />
          <MessageCircle size={18} className={styles.igActionIcon} />
          <Share2 size={18} className={styles.igActionIcon} />
        </div>
        {caption && <div className={styles.igCaption}><b>{user?.handle ?? 'you'}</b> {caption}</div>}
      </div>
    )

    if (activeTab === 'Facebook') return (
      <div className={styles.fbCard}>
        <div className={styles.fbHeader}>
          <div className={styles.fbAvatar}>{user?.avatar ?? 'U'}</div>
          <div className={styles.fbMeta}>
            <span className={styles.fbName}>{user?.name ?? 'You'}</span>
            <span className={styles.fbTime}>Just now · 🌐</span>
          </div>
        </div>
        {caption && <div className={styles.fbBody}>{caption}</div>}
        {firstImage
          ? <div className={styles.fbImage}><img src={firstImage.url} alt="" className={styles.fbImageActual} /></div>
          : null
        }
        <div className={styles.fbActions}>
          {[{icon:<ThumbsUp size={14}/>,label:'Like'},{icon:<MessageCircle size={14}/>,label:'Comment'},{icon:<Share2 size={14}/>,label:'Share'}].map((a,i)=>(
            <div key={i} className={styles.fbActionBtn}>{a.icon}{a.label}</div>
          ))}
        </div>
      </div>
    )

    // X
    return (
      <div className={styles.xCard}>
        <div className={styles.xHeader}>
          <div className={styles.xAvatar}>{user?.avatar ?? 'U'}</div>
          <div className={styles.xMeta}>
            <span className={styles.xName}>{user?.name ?? 'You'}</span>
            <span className={styles.xHandle}>@{user?.handle ?? 'you'}</span>
          </div>
        </div>
        {caption && <div className={styles.xBody}>{caption}</div>}
        {firstImage && <img src={firstImage.url} alt="" style={{width:'100%',borderRadius:8,marginTop:8}} />}
        <div className={styles.xActions}>
          {[{icon:<MessageCircle size={14}/>},{icon:<Repeat2 size={14}/>},{icon:<Heart size={14}/>},{icon:<BarChart2 size={14}/>},{icon:<BookMarked size={14}/>}].map((a,i)=>(
            <div key={i} className={styles.xActionBtn}>{a.icon}</div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div
      className={styles.backdrop}
      onMouseDown={e => {
        if (e.target !== e.currentTarget) return
        if (editingId) {
          setEditingId(null)
          return
        }
        onClose()
      }}
    >
      <div className={styles.dialog}>

        {editingId && (() => {
          const item = media.find(m => m.id === editingId)
          if (!item || item.type !== 'image') return null
          return (
            <div className={styles.editorBackdrop} onMouseDown={() => setEditingId(null)}>
              <div
                className={styles.editorModal}
                onMouseDown={e => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-label="Edit Image"
              >
                <div className={styles.editorModalHeader}>
                  <div className={styles.editorModalTitle}>Edit Image</div>
                  <button
                    type="button"
                    className={styles.editorModalClose}
                    onClick={() => setEditingId(null)}
                    aria-label="Close"
                  >
                    <X size={16} />
                  </button>
                </div>
                <div className={styles.editorModalBody}>
                  <ImageEditorPanel
                    src={item.url}
                    onSave={handleEditorSave}
                    onCancel={() => setEditingId(null)}
                  />
                </div>
              </div>
            </div>
          )
        })()}

        {/* ── Header ── */}
        <div className={styles.header}>
          <span className={styles.headerTitle}>Create Post</span>

          {/* Platform chips */}
          <div className={styles.platformChips}>
            {PLATFORMS.map(p => (
              <button
                key={p.id}
                className={`${styles.chip} ${p.className} ${activePlatforms.includes(p.id) ? styles.chipActive : ''}`}
                onClick={() => togglePlatform(p.id)}
              >
                <span>{PLATFORM_ICONS[p.id]}</span>
                {p.label}
              </button>
            ))}
          </div>

          <div className={styles.headerSpacer} />

          <button
            className={`${styles.headerBtn} ${showAI ? styles.headerBtnActive : ''}`}
            onClick={() => {
              setShowAI(true)
              setShowPreview(false)
            }}
          >
            <Sparkles size={14} /> AI Assistant
          </button>

          <button
            className={`${styles.headerBtn} ${showPreview ? styles.headerBtnActive : ''}`}
            onClick={() => {
              setShowPreview(true)
              setShowAI(false)
            }}
          >
            <Eye size={14} /> Preview
          </button>

          <button className={styles.closeBtn} onClick={onClose}><X size={16} /></button>
        </div>

        {/* ── Body ── */}
        <div className={styles.body}>

          {/* Composer */}
          <div className={styles.composer}>
            {!hasPlatforms ? (
              <div className={styles.composerEmpty}>
                <div className={styles.previewEmptyIcon}>
                  <ImageIcon size={28} style={{ color: 'var(--text-muted)' }} />
                </div>
                <span className={styles.previewEmptyText}>
                  Select a channel above to start creating your post
                </span>
              </div>
            ) : (
              <>
                {/* Platform tabs — only show selected platforms */}
                {activePlatforms.length > 1 && (
                  <div className={styles.platformTabs}>
                    {PLATFORMS.filter(p => activePlatforms.includes(p.id)).map(p => (
                      <button
                        key={p.id}
                        className={`${styles.platformTab} ${activeTab === p.id ? styles.platformTabActive : ''}`}
                        onClick={() => setActiveTab(p.id)}
                      >
                        <span>{PLATFORM_ICONS[p.id]}</span>
                        {p.label}
                      </button>
                    ))}
                  </div>
                )}

                {/* Post content area */}
                <div className={styles.postArea}>
              {/* Author row */}
              <div className={styles.authorRow}>
                <div className={styles.avatarWrap}>
                  <div className={styles.avatarBubble}>{user?.avatar ?? 'U'}</div>
                  <div className={`${styles.platformBadge} ${PLATFORM_BADGE_CLASS[activeTab]}`}>
                    {PLATFORM_ICONS[activeTab]}
                  </div>
                </div>
                <span className={styles.authorName}>{user?.name ?? 'You'}</span>
              </div>

              {/* Textarea */}
              <textarea
                ref={textareaRef}
                className={styles.textarea}
                placeholder="What would you like to share?"
                value={caption}
                onChange={e => setCaption(e.target.value)}
              />

              {/* Media upload */}
              {media.length === 0 ? (
                <div
                  className={`${styles.mediaZone} ${dragOver ? styles.mediaZoneDragOver : ''}`}
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={onDrop}
                >
                  <div className={styles.mediaZoneText}>
                    Drag & drop or <span>select a file</span>
                  </div>
                </div>
              ) : (
                <>
                  <div className={styles.mediaPreviewRow}>
                    {media.map(m => (
                      <div
                        key={m.id}
                        className={`${styles.thumbWrap} ${dragId === m.id ? styles.thumbWrapDragging : ''} ${dragOverId === m.id ? styles.thumbWrapDragOver : ''}`}
                        draggable
                        onDragStart={() => handleDragStart(m.id)}
                        onDragOver={e => handleDragOver(e, m.id)}
                        onDrop={() => handleDropOnThumb(m.id)}
                        onDragEnd={handleDragEnd}
                      >
                        {m.type === 'image'
                          ? <img src={m.url} alt={m.name} className={styles.mediaThumb} />
                          : <div className={styles.mediaThumbVideo}>🎬 Video</div>
                        }
                        <div className={styles.thumbOverlay}>
                          <button
                            type="button"
                            className={styles.thumbBtn}
                            title={m.type === 'image' ? 'Chỉnh sửa' : 'Thay thế'}
                            onClick={() => m.type === 'image' ? setEditingId(m.id) : handleReplaceVideo(m.id)}
                          >✏️</button>
                          <button
                            type="button"
                            className={`${styles.thumbBtn} ${styles.thumbBtnDelete}`}
                            title="Xóa"
                            onClick={() => removeMedia(m.id)}
                          ><X size={11} /></button>
                        </div>
                        {media[0]?.id === m.id && <span className={styles.thumbCoverBadge}>Cover</span>}
                      </div>
                    ))}
                    <div
                      className={styles.mediaZone}
                      style={{ width: 72, height: 72, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <span className={styles.mediaZoneText}><span>+ Add</span></span>
                    </div>
                  </div>
                </>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                multiple
                style={{ display: 'none' }}
                onChange={e => handleFiles(e.target.files)}
              />
              <input
                ref={replaceInputRef}
                type="file"
                accept="image/*,video/*"
                style={{ display: 'none' }}
                onChange={handleReplaceFile}
              />
            </div>

            {/* Toolbar */}
            <div className={styles.toolbar} style={{ position: 'relative' }}>
              <div ref={emojiRef} style={{ position: 'relative' }}>
                <button className={styles.toolbarBtn} onClick={() => setShowEmoji(v => !v)} title="Emoji">
                  <Smile size={18} />
                </button>
                {showEmoji && (
                  <div className={styles.emojiPopover}>
                    {COMMON_EMOJIS.map(e => (
                      <button key={e} className={styles.emojiBtn} onClick={() => { insertAtCursor(e); setShowEmoji(false) }}>
                        {e}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button className={styles.toolbarBtn} title="Hashtags"
                onClick={() => insertAtCursor(' ' + HASH_TAGS[Math.floor(Math.random() * HASH_TAGS.length)])}>
                <Hash size={18} />
              </button>

              <button className={styles.toolbarBtn} title="Settings"><Settings2 size={18} /></button>

              <div className={styles.toolbarSpacer} />
              <span className={`${styles.charCount} ${
                caption.length > charLimit ? styles.charCountOver
                : caption.length > charLimit * 0.85 ? styles.charCountWarn
                : ''
              }`}>
                {charLimit - caption.length}
              </span>
            </div>

            {/* Schedule row */}
            <div className={styles.scheduleRow}>
              <span className={styles.scheduleLabel}>Publish:</span>
              <button
                className={`${styles.scheduleChip} ${!scheduleMode ? styles.headerBtnActive : ''}`}
                onClick={() => setScheduleMode(false)}
              >
                <Settings2 size={12} /> Automatic
              </button>
              <button
                className={`${styles.scheduleChip} ${scheduleMode ? styles.headerBtnActive : ''}`}
                onClick={() => setScheduleMode(true)}
              >
                Schedule
              </button>
              {scheduleMode && (
                <input
                  type="datetime-local"
                  className={styles.dateInput}
                  value={scheduleTime}
                  onChange={e => setScheduleTime(e.target.value)}
                />
              )}
            </div>

            {/* Footer */}
            <div className={styles.footer}>
              <label className={styles.createAnotherLabel}>
                <input type="checkbox" checked={createAnother} onChange={e => setCreateAnother(e.target.checked)} />
                Create Another
              </label>
              <div className={styles.footerSpacer} />
              <button className={styles.draftBtn} onClick={handleDraft}>Save Draft</button>
              <button className={styles.scheduleBtn} onClick={handleSchedule} disabled={caption.trim() === '' || overLimit}>
                {scheduleMode ? 'Schedule Post' : 'Publish Now'}
              </button>
            </div>
              </>
            )}
          </div>

          {/* Right panel: AI Assistant or Preview */}
          {showAI && (
            <div className={styles.preview}>
              <div className={styles.previewHeader}>
                <Sparkles size={16} style={{ marginRight: 6 }} /> AI Assistant
              </div>
              <div className={styles.previewBody}>
                {!hasPlatforms ? (
                  <div className={styles.previewEmpty}>
                    <div className={styles.previewEmptyIcon}>
                      <Sparkles size={28} style={{ color: 'var(--text-muted)' }} />
                    </div>
                    <span className={styles.previewEmptyText}>
                      Select a channel to use AI Assistant
                    </span>
                  </div>
                ) : (
                  <div className={styles.aiSidePanel}>
                  <div className={styles.aiPromptSection}>
                    <label className={styles.aiPromptLabel}>What do you want to write about?</label>
                    <textarea
                      className={styles.aiPromptTextarea}
                      placeholder="Eg. Promote my photography course to get new signups. Registration closes in 3 days."
                      value={aiPrompt}
                      onChange={e => setAiPrompt(e.target.value)}
                      rows={4}
                    />
                    <div className={styles.aiTipText}>
                      <strong>Pro tip:</strong> Include key points, your target audience and your desired outcome for this post
                    </div>
                    <button
                      type="button"
                      className={styles.aiGenerateBtn}
                      onClick={handleGenerateAI}
                      disabled={aiPrompt.trim() === '' || aiIsGenerating}
                    >
                      <Sparkles size={14} />
                      {aiIsGenerating ? 'Generating...' : 'Generate'}
                    </button>
                  </div>

                  {aiResults.length > 0 && (
                    <div className={styles.aiResultsSection}>
                      <div className={styles.aiResultsHeader}>Suggestions</div>
                      <div className={styles.aiResultsList}>
                        {aiResults.map(s => (
                          <div
                            key={s.id}
                            className={styles.aiResultCard}
                            onClick={() => applyAISuggestion(s.caption)}
                          >
                            <div className={styles.aiResultType}>{s.type}</div>
                            <div className={styles.aiResultCaption}>{s.caption}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                )}
              </div>
            </div>
          )}

          {showPreview && (
            <div className={styles.preview}>
              <div className={styles.previewHeader}>
                <span>{activeTab}</span> Preview
              </div>
              <div className={styles.previewBody}>
                {!hasPlatforms ? (
                  <div className={styles.previewEmpty}>
                    <div className={styles.previewEmptyIcon}>
                      <ImageIcon size={28} style={{ color: 'var(--text-muted)' }} />
                    </div>
                    <span className={styles.previewEmptyText}>
                      Select a channel to see preview
                    </span>
                  </div>
                ) : (
                  <div className={styles.previewStage}>
                    <div className={styles.deviceFrame}>
                      <div className={styles.deviceScreen}>
                        {/* Status bar */}
                        <div className={styles.deviceStatusBar}>
                          <span className={styles.deviceTime}>9:41</span>
                          <div className={styles.deviceStatusIcons}>
                            <Signal size={11} />
                            <Wifi size={11} />
                            <Battery size={11} />
                          </div>
                        </div>

                        {/* Content */}
                        <div className={styles.deviceContent}>
                          {caption.trim() === '' && media.length === 0 && activeTab !== 'TikTok' ? (
                            <div className={styles.previewEmpty}>
                              <div className={styles.previewEmptyIcon}>
                                <ImageIcon size={22} style={{ color: 'var(--text-muted)' }} />
                              </div>
                              <span className={styles.previewEmptyText}>See your post's preview here</span>
                            </div>
                          ) : renderPreview()}
                        </div>

                        {/* TikTok bottom nav */}
                        {activeTab === 'TikTok' && (
                          <div className={styles.tiktokBottomNav}>
                            {[
                              { icon: <Home size={17} />, label: 'Home', active: true },
                              { icon: <Users size={17} />, label: 'Friends', active: false },
                              { icon: null, label: '', active: false },
                              { icon: <Inbox size={17} />, label: 'Inbox', active: false },
                              { icon: <User size={17} />, label: 'Profile', active: false },
                            ].map((item, i) =>
                              item.icon === null ? (
                                <div key={i} className={styles.tiktokBottomNavPlus}><span>+</span></div>
                              ) : (
                                <div key={i} className={`${styles.tiktokBottomNavItem} ${item.active ? styles.tiktokBottomNavItemActive : ''}`}>
                                  {item.icon}
                                  <span>{item.label}</span>
                                </div>
                              )
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    <p className={styles.previewDisclaimer}>
                      Previews are an approximation of how your post will look when published. The final post may look slightly different.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Re-export shortId so AppLayout can use it for toast IDs
export { shortId }
