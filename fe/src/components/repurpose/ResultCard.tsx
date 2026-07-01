import { useState, type ElementType } from 'react'
import {
  Copy, Check, ChevronDown, ChevronUp, Pencil, X,
  FileText, AlignLeft, LayoutGrid, Lightbulb, Zap, Quote, PenTool, ArrowRight, Type
} from 'lucide-react'
import type { RepurposeAtom, AtomType } from '../../context/repurposeContextBase'
import { getPlatformStyle } from '../../data/platforms'
import { cn } from '@/lib/utils'
import { ExtendedPlatformIcon } from '../create-post/platformIcons'

interface Props {
  atom: RepurposeAtom
  index?: number
  variant?: 'insight'
  onCreatePost?: (content: string) => void
  onCreatePostToolbar?: (content: string, platform: string, mediaUrl?: string, mediaType?: 'image' | 'video' | null) => void
}

const TYPE_CFG: Record<AtomType, { icon: ElementType; label: string }> = {
  POST:     { icon: FileText,    label: 'Post' },
  THREAD:   { icon: AlignLeft,   label: 'Thread' },
  CAROUSEL: { icon: LayoutGrid,  label: 'Carousel' },
  INSIGHT:  { icon: Lightbulb,   label: 'Insight' },
  TIP:      { icon: Zap,         label: 'Tip' },
  QUOTE:    { icon: Quote,       label: 'Quote' },
}

const getPlatformLabelName = (id: string): string => {
  const names: Record<string, string> = {
    twitter: 'Twitter / X',
    linkedin: 'LinkedIn',
    facebook: 'Facebook',
    instagram: 'Instagram',
    tiktok: 'TikTok',
    threads: 'Threads',
    youtube: 'YouTube',
    pinterest: 'Pinterest',
    reddit: 'Reddit',
    bluesky: 'Bluesky',
    telegram: 'Telegram',
    whatsapp: 'WhatsApp',
    snapchat: 'Snapchat',
    googlebusiness: 'Google Business',
  }
  return names[id.toLowerCase()] || id
}

const resolveMediaUrl = (path: string) => {
  if (!path) return ''
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path
  }
  const apiBase = (import.meta.env.VITE_API_BASE_URL as string) || 'http://localhost:5000'
  const rootBase = apiBase.replace(/\/api\/v\d+$/, '')
  const cleanPath = path.startsWith('/') ? path : `/${path}`
  return `${rootBase}${cleanPath}`
}

export default function ResultCard({ atom, index = 0, onCreatePostToolbar }: Props) {
  const [copied, setCopied] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editContent, setEditContent] = useState(atom.content)

  const style = getPlatformStyle(atom.platform)
  const typeInfo = TYPE_CFG[atom.type] || { icon: FileText, label: 'Post' }
  const TypeIcon = typeInfo.icon
  const isLong = editContent.length > 300
  const labelName = getPlatformLabelName(atom.platform)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(editContent)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleEdit = () => {
    setEditContent(atom.content)
    setEditing(true)
  }

  return (
    <div
      className={cn(
        "result-card group relative flex flex-col transition-all duration-200 animate-in fade-in slide-in-from-bottom-3 border border-border"
      )}
      style={{
        '--card-accent': style.color,
        background: 'var(--bg-card)',
        borderRadius: '14px',
        padding: '20px',
        overflow: 'hidden',
        animationDelay: `${index * 0.05}s`,
      } as React.CSSProperties}
    >
      {/* Left accent bar */}
      <div 
        className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-[14px]" 
        style={{ background: 'var(--card-accent)' }} 
      />

      {/* Header Row */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex gap-1.5 flex-wrap">
          {/* Platform Tag */}
          <span 
            className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded uppercase tracking-wide border" 
            style={{ 
              color: style.color, 
              background: style.bg, 
              borderColor: style.border 
            }}
          >
            <span className="platform-icon flex items-center justify-center w-3.5 h-3.5 shrink-0 rounded bg-white/10 p-0.5">
              <ExtendedPlatformIcon platform={atom.platform} size={12} />
            </span>
            {labelName}
          </span>

          {/* Type Tag */}
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded uppercase tracking-wide text-[var(--primary)] bg-[var(--primary)]/10 border border-[var(--primary)]/20">
            <TypeIcon className="w-2.5 h-2.5" /> {typeInfo.label}
          </span>
        </div>

        {/* Copy / Edit Action buttons */}
        <div className="flex items-center gap-1">
          {!editing && (
            <button 
              onClick={handleEdit} 
              className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:text-[var(--text)] transition-colors" 
              title="Chỉnh sửa"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
          )}
          <button 
            onClick={handleCopy} 
            className={cn(
              "w-7 h-7 rounded-md flex items-center justify-center transition-colors hover:bg-[var(--bg-elevated)]",
              copied ? "text-green-500" : "text-[var(--text-muted)] hover:text-[var(--text)]"
            )}
            title="Sao chép"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {atom.title && !editing && <h3 className="text-sm font-bold text-[var(--text)] leading-tight tracking-tight mb-2">{atom.title}</h3>}

      {/* Media Preview Container */}
      {atom.mediaUrl && !editing && (
        <div className="my-1 mb-3 rounded-lg overflow-hidden border border-border bg-accent/5 max-h-[280px] flex items-center justify-center relative group/media transition-all duration-300 hover:shadow-sm pointer-events-auto">
          {atom.mediaType === 'video' ? (
            <video
              src={resolveMediaUrl(atom.mediaUrl)}
              controls
              autoPlay
              loop
              muted
              playsInline
              className="w-full max-h-[280px] object-contain relative z-10 pointer-events-auto"
              preload="metadata"
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
            />
          ) : (
            <img
              src={resolveMediaUrl(atom.mediaUrl)}
              alt={atom.title || "Repurposed Media"}
              className="w-full max-h-[280px] object-cover hover:scale-[1.02] transition-transform duration-500"
              loading="lazy"
            />
          )}
        </div>
      )}

      {/* Content Text / Editor */}
      {editing ? (
        <div className="flex flex-col gap-2 mb-3">
          <textarea
            className="w-full min-h-[100px] rounded-md border border-[var(--border)] bg-[var(--bg-elevated)] p-2.5 text-sm text-[var(--text)] resize-y outline-none focus:ring-2 focus:ring-[var(--primary)]"
            value={editContent}
            onChange={e => setEditContent(e.target.value)}
            rows={5}
            autoFocus
          />
          <div className="flex gap-2">
            <button
              onClick={() => { setEditing(false) }}
              className="px-3 py-1.5 rounded-md bg-[var(--primary)] text-white text-xs font-semibold hover:opacity-90 transition-all"
            >
              Lưu nháp
            </button>
            <button 
              onClick={() => { setEditContent(atom.content); setEditing(false) }} 
              className="px-3 py-1.5 rounded-md border border-[var(--border)] text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
            >
              <X className="w-3 h-3 inline mr-1" /> Hủy
            </button>
          </div>
        </div>
      ) : (
        <>
          <p 
            className={cn(
              "text-sm text-[var(--text)] leading-relaxed whitespace-pre-wrap mb-3",
              !expanded && "line-clamp-5"
            )}
            style={!expanded ? {
              display: '-webkit-box',
              WebkitLineClamp: 5,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden'
            } : {}}
          >
            {editContent}
          </p>
          {isLong && (
            <button 
              onClick={() => setExpanded(e => !e)} 
              className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--primary)] hover:opacity-85 transition-colors w-fit mb-3"
            >
              {expanded ? <><ChevronUp className="w-3.5 h-3.5" /> Thu gọn</> : <><ChevronDown className="w-3.5 h-3.5" /> Xem thêm</>}
            </button>
          )}
        </>
      )}

      {/* CTA & Hashtags Row */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {atom.suggestedCTA && (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[var(--primary)]/15 text-[var(--primary)] border border-[var(--primary)]/25">
            {atom.suggestedCTA}
          </span>
        )}
        {atom.suggestedHashtags.slice(0, 3).map(tag => (
          <span 
            key={tag} 
            className="text-[10px] px-2 py-0.5 rounded bg-[var(--bg-elevated)] text-[var(--text-muted)] border border-[var(--border)] font-medium"
          >
            {tag.startsWith('#') ? tag : `#${tag}`}
          </span>
        ))}
      </div>

      {/* Compose Button */}
      <button 
        className="compose-btn mt-auto" 
        onClick={() => onCreatePostToolbar?.(editContent, atom.platform, atom.mediaUrl, atom.mediaType)}
      >
        <PenTool className="w-3.5 h-3.5" />
        Tạo bài đăng trên {labelName}
        <ArrowRight className="w-3.5 h-3.5" />
      </button>

      {/* Footer */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-[var(--border)]">
        <span className="text-[11px] text-[var(--text-muted)] flex items-center gap-1">
          <Type className="w-3 h-3" /> {editContent.length} ký tự
        </span>
      </div>
    </div>
  )
}
