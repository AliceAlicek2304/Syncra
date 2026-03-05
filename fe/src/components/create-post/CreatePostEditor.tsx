/* eslint-disable react-hooks/refs */
import { useState, useRef } from 'react'
import { Smile, Hash, Settings2, X, Crop, RotateCcw, RotateCw, FlipHorizontal, Check } from 'lucide-react'
import { COMMON_EMOJIS, HASH_TAGS, CROP_PRESETS, PLATFORM_ICONS, type Platform } from './types'
import type { UseCreatePostStateReturn } from './useCreatePostState'
import styles from '../CreatePostModal.module.css'

interface EditorPanelProps { src: string; onSave: (blob: Blob) => void; onCancel: () => void }

export function ImageEditorPanel({ src, onSave, onCancel }: EditorPanelProps) {
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
      const sx = (cropRect.x / or.width) * cw; const sy = (cropRect.y / or.height) * ch
      const sw = (cropRect.w / or.width) * cw; const sh = (cropRect.h / or.height) * ch
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

const PLATFORM_BADGE_CLASS: Record<Platform, string> = {
  TikTok: styles.badgeTikTok,
  Instagram: styles.badgeIG,
  Facebook: styles.badgeFB,
  X: styles.badgeX,
}

export default function CreatePostEditor({ state, refs, actions }: UseCreatePostStateReturn) {
  return (
    <>
      <div className={styles.postArea}>
        {/* Author row */}
        <div className={styles.authorRow}>
          <div className={styles.avatarWrap}>
            <div className={styles.avatarBubble}>{state.user?.avatar ?? 'U'}</div>
            <div className={`${styles.platformBadge} ${PLATFORM_BADGE_CLASS[state.activeTab]}`}>
              {PLATFORM_ICONS[state.activeTab]}
            </div>
          </div>
          <span className={styles.authorName}>{state.user?.name ?? 'You'}</span>
        </div>

        {/* Textarea */}
        <textarea
          ref={refs.textareaRef}
          className={styles.textarea}
          placeholder="What would you like to share?"
          value={state.caption}
          onChange={e => actions.setActiveCaption(e.target.value)}
        />

        {/* Media upload */}
        {state.media.length === 0 ? (
          <div
            className={`${styles.mediaZone} ${state.dragOver ? styles.mediaZoneDragOver : ''}`}
            onClick={() => refs.fileInputRef.current?.click()}
            onDragOver={e => { e.preventDefault(); actions.setDragOver(true) }}
            onDragLeave={() => actions.setDragOver(false)}
            onDrop={actions.onDrop}
          >
            <div className={styles.mediaZoneIcon}>📁</div>
            <div className={styles.mediaZoneText}>
              Drag & drop or <span>select media</span>
            </div>
            <div className={styles.mediaZoneHint}>PNG, JPG, GIF, MP4 supported</div>
          </div>
        ) : (
          <div className={styles.mediaPreviewRow}>
            {state.media.map(m => (
              <div
                key={m.id}
                className={`${styles.thumbWrap} ${state.dragId === m.id ? styles.thumbWrapDragging : ''} ${state.dragOverId === m.id ? styles.thumbWrapDragOver : ''}`}
                draggable
                onDragStart={() => actions.handleDragStart(m.id)}
                onDragOver={e => actions.handleDragOver(e, m.id)}
                onDrop={() => actions.handleDropOnThumb(m.id)}
                onDragEnd={actions.handleDragEnd}
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
                    onClick={() => m.type === 'image' ? actions.setEditingId(m.id) : actions.handleReplaceVideo(m.id)}
                  >✏️</button>
                  <button
                    type="button"
                    className={`${styles.thumbBtn} ${styles.thumbBtnDelete}`}
                    title="Xóa"
                    onClick={() => actions.removeMedia(m.id)}
                  ><X size={11} /></button>
                </div>
                {state.media[0]?.id === m.id && <span className={styles.thumbCoverBadge}>Cover</span>}
              </div>
            ))}
            <div
              className={styles.mediaZone}
              style={{ width: 72, height: 72, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}
              onClick={() => refs.fileInputRef.current?.click()}
            >
              <span className={styles.mediaZoneText}><span>+ Add</span></span>
            </div>
          </div>
        )}

        <input
          ref={refs.fileInputRef}
          type="file"
          accept="image/*,video/*"
          multiple
          style={{ display: 'none' }}
          onChange={e => actions.handleFiles(e.target.files)}
        />
        <input
          ref={refs.replaceInputRef}
          type="file"
          accept="image/*,video/*"
          style={{ display: 'none' }}
          onChange={actions.handleReplaceFile}
        />
      </div>

      {/* Toolbar */}
      <div className={styles.toolbar} style={{ position: 'relative' }}>
        <div ref={refs.emojiRef} style={{ position: 'relative' }}>
          <button className={styles.toolbarBtn} onClick={() => actions.setShowEmoji(!state.showEmoji)} title="Emoji">
            <Smile size={18} />
          </button>
          {state.showEmoji && (
            <div className={styles.emojiPopover}>
              {COMMON_EMOJIS.map(e => (
                <button key={e} className={styles.emojiBtn} onClick={() => { actions.insertAtCursor(e); actions.setShowEmoji(false) }}>
                  {e}
                </button>
              ))}
            </div>
          )}
        </div>

        <button className={styles.toolbarBtn} title="Hashtags"
          onClick={() => actions.insertAtCursor(' ' + HASH_TAGS[Math.floor(Math.random() * HASH_TAGS.length)])}>
          <Hash size={18} />
        </button>

        <button className={styles.toolbarBtn} title="Settings"><Settings2 size={18} /></button>

        <div className={styles.toolbarSpacer} />
        <span className={`${styles.charCount} ${state.overLimit ? styles.charCountOver
          : state.caption.length > state.charLimit * 0.85 ? styles.charCountWarn
            : ''
          }`}>
          {state.charLimit - state.caption.length}
        </span>
      </div>
    </>
  )
}