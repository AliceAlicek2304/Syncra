import { useState, type ElementType } from 'react'
import {
  Copy, Check, ChevronDown, ChevronUp, Pencil, X,
  FileText, AlignLeft, LayoutGrid, Lightbulb, Zap, Quote, PenTool,
} from 'lucide-react'
import type { RepurposeAtom, AtomType } from '../../context/repurposeContextBase'
import { getPlatformStyle } from '../../data/platforms'
import { ExtendedPlatformIcon } from '../create-post/platformIcons'
import { cn } from '@/lib/utils'

interface Props {
  atom: RepurposeAtom
  index?: number
  variant?: 'insight'
  onCreatePost?: (content: string) => void
  onCreatePostToolbar?: (content: string) => void
}

const TYPE_CFG: Record<AtomType, { icon: ElementType; label: string }> = {
  POST:     { icon: FileText,    label: 'Post' },
  THREAD:   { icon: AlignLeft,   label: 'Thread' },
  CAROUSEL: { icon: LayoutGrid,  label: 'Carousel' },
  INSIGHT:  { icon: Lightbulb,   label: 'Insight' },
  TIP:      { icon: Zap,         label: 'Tip' },
  QUOTE:    { icon: Quote,       label: 'Quote' },
}

export default function ResultCard({ atom, index = 0, variant, onCreatePostToolbar }: Props) {
  const [copied, setCopied] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editContent, setEditContent] = useState(atom.content)

  const style = getPlatformStyle(atom.platform)
  const typeInfo = TYPE_CFG[atom.type]
  const TypeIcon = typeInfo.icon
  const isLong = atom.content.length > 300

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
        "group relative bg-card border rounded-lg p-[18px] pb-4 pl-[22px] flex flex-col gap-2.5 overflow-hidden transition-all duration-200 animate-in fade-in slide-in-from-bottom-3",
        variant === 'insight' ? "border-primary/30 bg-primary/[0.015]" : "border-border hover:border-[var(--card-color)] hover:shadow-md hover:-translate-y-0.5",
      )}
      style={{
        '--card-color': style.color,
        '--card-border': style.border,
        animationDelay: `${index * 0.06}s`,
      } as React.CSSProperties}
    >
      <div className="absolute left-0 top-0 w-[3px] h-full rounded-l-lg opacity-80" style={{ background: style.color }} />

      <div className="flex items-start justify-between gap-2">
        <div className="flex gap-1.5 flex-wrap">
          <span
            className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded border uppercase tracking-wide"
            style={{ color: style.color, background: style.bg, borderColor: style.border }}
          >
            <ExtendedPlatformIcon platform={atom.platform} size={12} />
            {atom.platform}
          </span>
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded border uppercase tracking-wide text-primary border-primary/20 bg-primary/5">
            <TypeIcon size={10} />
            {typeInfo.label}
          </span>
        </div>

        {!editing && (
          <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={handleEdit} className="size-7 rounded border border-border bg-background text-muted-foreground hover:text-foreground hover:border-muted-foreground/30 transition-all flex items-center justify-center" title="Edit">
              <Pencil size={11} />
            </button>
            <button
              onClick={() => onCreatePostToolbar?.(editContent)}
              className="px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors flex items-center gap-1.5"
            >
              <PenTool size={11} />Create Post
            </button>
            <button
              onClick={handleCopy}
              className={cn(
                "size-7 rounded border transition-all flex items-center justify-center",
                copied
                  ? "border-green-500/30 bg-green-500/10 text-green-500"
                  : "border-border bg-background text-muted-foreground hover:text-foreground hover:border-muted-foreground/30"
              )}
              title={copied ? 'Copied!' : 'Copy'}
            >
              {copied ? <Check size={11} /> : <Copy size={11} />}
            </button>
          </div>
        )}
      </div>

      {atom.title && <h3 className="text-sm font-bold text-foreground leading-tight tracking-tight">{atom.title}</h3>}

      {editing ? (
        <div className="flex flex-col gap-2">
          <textarea
            className="w-full min-h-[100px] rounded-md border border-border bg-background p-2.5 text-sm text-foreground resize-y outline-none focus:ring-2 focus:ring-ring"
            value={editContent}
            onChange={e => setEditContent(e.target.value)}
            rows={5}
            autoFocus
          />
          <div className="flex gap-2">
            <button
              onClick={() => onCreatePostToolbar?.(editContent)}
              className="px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors"
            >
              <PenTool size={11} className="inline mr-1" />Create Post
            </button>
            <button onClick={() => { setEditContent(atom.content); setEditing(false) }} className="px-3 py-1.5 rounded-md border border-border text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors">
              <X size={11} className="inline mr-1" />Cancel
            </button>
          </div>
        </div>
      ) : (
        <>
          <p className={cn(
            "text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap",
            !expanded && "line-clamp-5"
          )}>
            {editContent}
          </p>
          {isLong && (
            <button onClick={() => setExpanded(e => !e)} className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary/80 transition-colors w-fit">
              {expanded ? <><ChevronUp size={12} /> Thu gọn</> : <><ChevronDown size={12} /> Xem thêm</>}
            </button>
          )}
        </>
      )}

      <div className="flex items-end justify-between gap-2 mt-auto">
        <div className="flex flex-wrap gap-1.5">
          {atom.suggestedCTA && (
            <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
              {atom.suggestedCTA}
            </span>
          )}
          {atom.suggestedHashtags.slice(0, 3).map(tag => (
            <span key={tag} className="text-[11px] px-1.5 py-0.5 rounded bg-background text-muted-foreground border border-border font-medium">
              {tag}
            </span>
          ))}
        </div>
        <span className="text-[11px] text-muted-foreground shrink-0">{editContent.length} ký tự</span>
      </div>
    </div>
  )
}
