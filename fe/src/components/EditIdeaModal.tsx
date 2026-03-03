import { useState, useRef, useCallback, useEffect } from 'react'
import {
    X, Sparkles, Smile, Hash,
    RotateCcw, RotateCw, Crop, Check, FlipHorizontal,
} from 'lucide-react'
import { shortId } from '../utils/shortId'
import { useCreatePostModal } from '../context/createPostModalContext'
import IdeaAIAssistantPanel from './IdeaAIAssistantPanel'
import styles from './EditIdeaModal.module.css'

// ── Types ──────────────────────────────────────────────────────────────────
interface Group { id: string; name: string }

interface Idea {
    id: string
    title: string
    description?: string
    status: string
    createdAt: number
}

interface MediaFile { id: string; url: string; type: 'image' | 'video'; name: string }

interface Props {
    idea: Idea
    groups: Group[]
    onSave: (idea: Idea) => void
    onDelete: (id: string) => void
    onClose: () => void
}

// ── Common emojis & hashtags ───────────────────────────────────────────────
const COMMON_EMOJIS = ['😊', '🔥', '💡', '🚀', '✅', '💬', '👇', '❤️', '🎯', '💪', '📊', '🌟', '😂', '👏', '🙌', '💼', '🎉', '✨', '📱', '💰']
const HASH_TAGS = ['#contentcreator', '#viral', '#trending', '#socialmedia', '#growth', '#marketing']

// ── Crop presets ──────────────────────────────────────────────────────────
const CROP_PRESETS = [
    { label: 'Free', ratio: null },
    { label: '1:1', ratio: 1 },
    { label: '4:3', ratio: 4 / 3 },
    { label: '16:9', ratio: 16 / 9 },
    { label: '9:16', ratio: 9 / 16 },
]

// ── Inline Image Editor (reused pattern from CreatePostModal) ─────────────
interface EditorPanelProps { src: string; onSave: (blob: Blob) => void; onCancel: () => void }

function ImageEditorPanel({ src, onSave, onCancel }: EditorPanelProps) {
    const [rotation, setRotation] = useState(0)
    const [flipH, setFlipH] = useState(false)
    const [cropStart, setCropStart] = useState<{ x: number; y: number } | null>(null)
    const [cropEnd, setCropEnd] = useState<{ x: number; y: number } | null>(null)
    const [dragging, setDragging] = useState(false)
    const [activeCrop, setActiveCrop] = useState<string>('Free')
    const imgRef = useRef<HTMLImageElement>(null)
    const overlayRef = useRef<HTMLDivElement>(null)

    const rotateBy = (dir: 1 | -1) => setRotation(r => (r + dir * 90 + 360) % 360)
    const resetEditor = () => { setRotation(0); setFlipH(false); setCropStart(null); setCropEnd(null); setActiveCrop('Free') }

    const applyCropPreset = (label: string, ratio: number | null) => {
        setActiveCrop(label)
        if (!ratio || !overlayRef.current) { setCropStart(null); setCropEnd(null); return }
        const { width: w, height: h } = overlayRef.current.getBoundingClientRect()
        const boxH = ratio < 1 ? w * (1 / ratio) : w / ratio
        const clampH = Math.min(boxH, h)
        const clampW = clampH * ratio
        const x = (w - clampW) / 2; const y = (h - clampH) / 2
        setCropStart({ x, y }); setCropEnd({ x: x + clampW, y: y + clampH })
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
        setCropEnd(null); setDragging(true); setActiveCrop('Free')
    }
    const onMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!dragging) return
        const rect = overlayRef.current!.getBoundingClientRect()
        setCropEnd({ x: e.clientX - rect.left, y: e.clientY - rect.top })
    }
    const onMouseUp = () => setDragging(false)

    const handleApply = () => {
        const img = imgRef.current; if (!img) return
        const isRotated90 = rotation === 90 || rotation === 270
        const ow = img.naturalWidth; const oh = img.naturalHeight
        const cw = isRotated90 ? oh : ow; const ch = isRotated90 ? ow : oh
        const canvas = document.createElement('canvas')
        canvas.width = cw; canvas.height = ch
        const ctx = canvas.getContext('2d')!
        ctx.translate(cw / 2, ch / 2); ctx.rotate((rotation * Math.PI) / 180)
        if (flipH) ctx.scale(-1, 1)
        ctx.drawImage(img, -ow / 2, -oh / 2); ctx.setTransform(1, 0, 0, 1, 0, 0)
        const cropRect = getRect()
        if (cropRect && overlayRef.current) {
            const or = overlayRef.current.getBoundingClientRect()
            const sx = (cropRect.x / or.width) * cw; const sy = (cropRect.y / or.height) * ch
            const sw = (cropRect.w / or.width) * cw; const sh = (cropRect.h / or.height) * ch
            const cc = document.createElement('canvas')
            cc.width = Math.max(1, sw); cc.height = Math.max(1, sh)
            cc.getContext('2d')!.drawImage(canvas, -sx, -sy)
            cc.toBlob(b => { if (b) onSave(b) }, 'image/jpeg', 0.92); return
        }
        canvas.toBlob(b => { if (b) onSave(b) }, 'image/jpeg', 0.92)
    }

    const imgTransform = [`rotate(${rotation}deg)`, flipH ? 'scaleX(-1)' : ''].filter(Boolean).join(' ')
    const cropRect = getRect()

    return (
        <div className={styles.editorPanel}>
            <div
                ref={overlayRef}
                className={styles.editorCanvas}
                onMouseDown={onMouseDown}
                onMouseMove={onMouseMove}
                onMouseUp={onMouseUp}
                onMouseLeave={onMouseUp}
            >
                <img
                    ref={imgRef} src={src} alt="edit" className={styles.editorImg}
                    style={{ transform: imgTransform }} draggable={false} crossOrigin="anonymous"
                />
                {cropRect && (
                    <div
                        className={styles.cropOverlay}
                        style={{ left: cropRect.x, top: cropRect.y, width: cropRect.w, height: cropRect.h }}
                    />
                )}
            </div>

            <div className={styles.editorControls}>
                <div className={styles.editorCropPresets}>
                    <Crop size={13} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                    {CROP_PRESETS.map(p => (
                        <button
                            key={p.label} type="button"
                            className={`${styles.editorCropBtn} ${activeCrop === p.label ? styles.editorCropBtnActive : ''}`}
                            onClick={() => applyCropPreset(p.label, p.ratio)}
                        >{p.label}</button>
                    ))}
                </div>
                <div className={styles.editorControlsDivider} />
                <div className={styles.editorRotateBtns}>
                    <button type="button" className={styles.editorIconBtn} title="Rotate left" onClick={() => rotateBy(-1)}><RotateCcw size={15} /></button>
                    <button type="button" className={styles.editorIconBtn} title="Rotate right" onClick={() => rotateBy(1)}><RotateCw size={15} /></button>
                    <button type="button" className={styles.editorIconBtn} title="Flip" onClick={() => setFlipH(f => !f)}><FlipHorizontal size={15} /></button>
                    <button type="button" className={styles.editorIconBtn} title="Reset" onClick={resetEditor}>Reset</button>
                </div>
            </div>

            <div className={styles.editorFooterRow}>
                <button type="button" className={styles.editorCancelBtn} onClick={onCancel}><X size={18} /></button>
                <span className={styles.editorHint}>
                    {cropRect ? `${Math.round(cropRect.w)} × ${Math.round(cropRect.h)} px` : 'Drag to select crop area'}
                </span>
                <button type="button" className={styles.editorApplyBtn} onClick={handleApply}><Check size={18} /></button>
            </div>
        </div>
    )
}

// ── Main Component ────────────────────────────────────────────────────────
export default function EditIdeaModal({ idea, groups, onSave, onClose }: Omit<Props, 'onDelete'> & { onDelete?: (id: string) => void }) {
    const [title, setTitle] = useState(idea.title)
    const [content, setContent] = useState(idea.description ?? '')
    const [status, setStatus] = useState(idea.status)
    const [showAI, setShowAI] = useState(false)
    const [showEmoji, setShowEmoji] = useState(false)
    const [media, setMedia] = useState<MediaFile[]>([])
    const [dragOver, setDragOver] = useState(false)
    const [dragId, setDragId] = useState<string | null>(null)
    const [dragOverId, setDragOverId] = useState<string | null>(null)
    const [editingId, setEditingId] = useState<string | null>(null)

    const { openCreatePost } = useCreatePostModal()

    const fileInputRef = useRef<HTMLInputElement>(null)
    const replaceInputRef = useRef<HTMLInputElement>(null)
    const replaceTargetIdRef = useRef<string | null>(null)
    const textareaRef = useRef<HTMLTextAreaElement>(null)
    const emojiRef = useRef<HTMLDivElement>(null)

    // Close on Escape
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key !== 'Escape') return
            if (editingId) { setEditingId(null); return }
            onClose()
        }
        window.addEventListener('keydown', handler)
        return () => window.removeEventListener('keydown', handler)
    }, [onClose, editingId])

    // Close emoji on outside click
    useEffect(() => {
        if (!showEmoji) return
        const handler = (e: MouseEvent) => {
            if (emojiRef.current && !emojiRef.current.contains(e.target as Node)) setShowEmoji(false)
        }
        window.addEventListener('mousedown', handler)
        return () => window.removeEventListener('mousedown', handler)
    }, [showEmoji])

    // ── Media ────────────────────────────────────────────────────────────
    const handleFiles = useCallback((files: FileList | null) => {
        if (!files) return
        Array.from(files).forEach(file => {
            const url = URL.createObjectURL(file)
            const type = file.type.startsWith('video') ? 'video' : 'image'
            setMedia(prev => [...prev, { id: shortId(), url, type, name: file.name }])
        })
    }, [])

    const onDrop = (e: React.DragEvent) => {
        e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files)
    }

    const removeMedia = (id: string) => {
        setMedia(prev => { const item = prev.find(m => m.id === id); if (item) URL.revokeObjectURL(item.url); return prev.filter(m => m.id !== id) })
        setEditingId(prev => prev === id ? null : prev)
    }

    const handleDragStart = (id: string) => setDragId(id)
    const handleDragOver = (e: React.DragEvent, id: string) => { e.preventDefault(); setDragOverId(id) }
    const handleDropOnThumb = (id: string) => {
        if (!dragId || dragId === id) { setDragId(null); setDragOverId(null); return }
        setMedia(prev => {
            const from = prev.findIndex(m => m.id === dragId)
            const to = prev.findIndex(m => m.id === id)
            if (from < 0 || to < 0) return prev
            const next = [...prev]; const [item] = next.splice(from, 1); next.splice(to, 0, item); return next
        })
        setDragId(null); setDragOverId(null)
    }
    const handleDragEnd = () => { setDragId(null); setDragOverId(null) }

    const handleReplaceVideo = (id: string) => { replaceTargetIdRef.current = id; replaceInputRef.current?.click() }
    const handleReplaceFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]; const targetId = replaceTargetIdRef.current
        if (!file || !targetId) return
        const newUrl = URL.createObjectURL(file)
        const newType: 'image' | 'video' = file.type.startsWith('video') ? 'video' : 'image'
        setMedia(prev => prev.map(m => { if (m.id !== targetId) return m; URL.revokeObjectURL(m.url); return { ...m, url: newUrl, type: newType, name: file.name } }))
        e.target.value = ''; replaceTargetIdRef.current = null
    }

    const handleEditorSave = (blob: Blob) => {
        if (!editingId) return
        const newUrl = URL.createObjectURL(blob)
        setMedia(prev => prev.map(m => { if (m.id !== editingId) return m; URL.revokeObjectURL(m.url); return { ...m, url: newUrl, name: m.name.replace(/\.[^.]+$/, '') + '_edited.jpg' } }))
        setEditingId(null)
    }

    // ── Text insert ───────────────────────────────────────────────────────
    const insertAtCursor = (text: string) => {
        const el = textareaRef.current
        if (!el) { setContent(c => c + text); return }
        const start = el.selectionStart ?? content.length
        const end = el.selectionEnd ?? content.length
        const next = content.slice(0, start) + text + content.slice(end)
        setContent(next)
        setTimeout(() => { el.selectionStart = el.selectionEnd = start + text.length; el.focus() }, 0)
    }

    // ── Save ─────────────────────────────────────────────────────────────
    const handleSave = () => {
        onSave({ ...idea, title: title.trim() || idea.title, description: content, status })
        onClose()
    }

    // ── Render ────────────────────────────────────────────────────────────
    return (
        <div className={styles.backdrop} onMouseDown={e => { if (e.target !== e.currentTarget) return; if (editingId) { setEditingId(null); return } onClose() }}>
            <div className={styles.dialog}>

                {/* Image editor overlay */}
                {editingId && (() => {
                    const item = media.find(m => m.id === editingId)
                    if (!item || item.type !== 'image') return null
                    return (
                        <div className={styles.editorBackdrop} onMouseDown={() => setEditingId(null)}>
                            <div className={styles.editorModal} onMouseDown={e => e.stopPropagation()} role="dialog" aria-modal>
                                <div className={styles.editorModalHeader}>
                                    <div className={styles.editorModalTitle}>Edit Image</div>
                                    <button type="button" className={styles.editorModalClose} onClick={() => setEditingId(null)}><X size={16} /></button>
                                </div>
                                <div className={styles.editorModalBody}>
                                    <ImageEditorPanel src={item.url} onSave={handleEditorSave} onCancel={() => setEditingId(null)} />
                                </div>
                            </div>
                        </div>
                    )
                })()}

                {/* ── Header ── */}
                <div className={styles.header}>
                    <span className={styles.headerTitle}>Edit Idea</span>

                    <div className={styles.headerSpacer} />

                    {/* Group selector chip */}
                    <div className={styles.groupSelect}>
                        <select
                            className={styles.groupSelectInput}
                            value={status}
                            onChange={e => setStatus(e.target.value)}
                        >
                            {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                        </select>
                    </div>

                    {/* AI Assistant toggle */}
                    <button
                        className={`${styles.headerBtn} ${showAI ? styles.headerBtnActive : ''}`}
                        onClick={() => setShowAI(v => !v)}
                    >
                        <Sparkles size={14} /> AI Assistant
                    </button>

                    <button className={styles.closeBtn} onClick={onClose}><X size={16} /></button>
                </div>

                {/* ── Body ── */}
                <div className={styles.body}>

                    {/* LEFT — Composer */}
                    <div className={`${styles.composer} ${showAI ? styles.composerWithAI : ''}`}>
                        <div className={styles.postArea}>
                            {/* Title */}
                            <div className={styles.fieldGroup}>
                                <label className={styles.fieldLabel}>Idea Title</label>
                                <input
                                    className={styles.titleInput}
                                    placeholder="Enter your idea title…"
                                    value={title}
                                    onChange={e => setTitle(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleSave()}
                                />
                            </div>

                            {/* Content */}
                            <div className={styles.fieldGroup} style={{ flex: 1 }}>
                                <label className={styles.fieldLabel}>Content</label>
                                <textarea
                                    ref={textareaRef}
                                    className={styles.contentTextarea}
                                    placeholder="Describe your idea in detail…"
                                    value={content}
                                    onChange={e => setContent(e.target.value)}
                                />
                            </div>

                            {/* Media */}
                            {media.length === 0 ? (
                                <div
                                    className={`${styles.mediaZone} ${dragOver ? styles.mediaZoneDragOver : ''}`}
                                    onClick={() => fileInputRef.current?.click()}
                                    onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                                    onDragLeave={() => setDragOver(false)}
                                    onDrop={onDrop}
                                >
                                    <div className={styles.mediaZoneIcon}>📁</div>
                                    <div className={styles.mediaZoneText}>
                                        Drag & drop or <span>select media</span>
                                    </div>
                                    <div className={styles.mediaZoneHint}>PNG, JPG, GIF, MP4 supported</div>
                                </div>
                            ) : (
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
                                                    type="button" className={styles.thumbBtn}
                                                    title={m.type === 'image' ? 'Edit' : 'Replace'}
                                                    onClick={() => m.type === 'image' ? setEditingId(m.id) : handleReplaceVideo(m.id)}
                                                >✏️</button>
                                                <button
                                                    type="button"
                                                    className={`${styles.thumbBtn} ${styles.thumbBtnDelete}`}
                                                    title="Remove"
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
                            )}

                            <input ref={fileInputRef} type="file" accept="image/*,video/*" multiple style={{ display: 'none' }} onChange={e => handleFiles(e.target.files)} />
                            <input ref={replaceInputRef} type="file" accept="image/*,video/*" style={{ display: 'none' }} onChange={handleReplaceFile} />
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
                                            <button key={e} className={styles.emojiBtn} onClick={() => { insertAtCursor(e); setShowEmoji(false) }}>{e}</button>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <button className={styles.toolbarBtn} title="Hashtag"
                                onClick={() => insertAtCursor(' ' + HASH_TAGS[Math.floor(Math.random() * HASH_TAGS.length)])}>
                                <Hash size={18} />
                            </button>
                            <div className={styles.toolbarSpacer} />
                            <span className={styles.charCount}>{content.length} chars</span>
                        </div>

                        {/* Footer */}
                        <div className={styles.footer}>
                            <div className={styles.footerSpacer} />
                            <button
                                className={styles.cancelBtn}
                                style={{ marginRight: 8 }}
                                onClick={() => {
                                    const fullContent = title.trim() ? `${title.trim()}\n\n${content}` : content;
                                    openCreatePost({ initialContent: fullContent, source: 'idea' });
                                    onClose();
                                }}
                            >
                                Create Post
                            </button>
                            <button className={styles.saveBtn} onClick={handleSave}>Save Changes</button>
                        </div>
                    </div>

                    {/* RIGHT — AI Panel */}
                    {showAI && (
                        <IdeaAIAssistantPanel
                            title={title}
                            content={content}
                            onApply={text => setContent(text)}
                        />
                    )}
                </div>
            </div>
        </div>
    )
}