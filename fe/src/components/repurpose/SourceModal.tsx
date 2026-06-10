import { useState, useRef } from 'react'
import { Search, Upload, Link, X } from 'lucide-react'
import type { SupportingSource } from '../../context/repurposeContextBase'
import { cn } from '@/lib/utils'

interface Props {
  open: boolean
  onClose: () => void
  onAdd: (source: SupportingSource) => void
}

const ACCEPTED_TYPES = '.txt,.md,.docx,.pdf'

export default function SourceModal({ open, onClose, onAdd }: Props) {
  const [tab, setTab] = useState<'research' | 'file'>('research')
  const [url, setUrl] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  if (!open) return null

  const handleAddUrl = () => {
    if (!url.trim()) return
    onAdd({
      id: `src-${Date.now()}`,
      type: 'url',
      label: url.length > 40 ? url.slice(0, 40) + '...' : url,
      url: url.trim(),
      status: 'processing',
    })
    setUrl('')
  }

  const handleFileAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    onAdd({
      id: `src-${Date.now()}`,
      type: 'file',
      label: file.name,
      fileName: file.name,
      status: 'processing',
    })
    e.target.value = ''
  }

  return (
    <div
      className="fixed inset-0 z-[9500] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onMouseDown={onClose}
    >
      <div
        className="w-full max-w-lg bg-card border border-border rounded-xl shadow-2xl animate-in slide-in-from-bottom-4 duration-200"
        onMouseDown={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Add Source"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-base font-bold text-foreground font-title">Add Source</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="p-5">
          <div className="relative mb-4">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search or paste a URL..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full h-9 pl-9 pr-3 rounded-md border border-border bg-background text-sm text-foreground outline-none placeholder:text-muted-foreground/60 focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="flex gap-1 mb-4 border-b border-border">
            {(['research', 'file'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={cn(
                  "px-3 py-2 text-xs font-semibold rounded-t-md transition-colors",
                  tab === t
                    ? "text-foreground bg-background border border-border border-b-background -mb-px"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {t === 'research' ? 'Research from URL' : 'Upload File'}
              </button>
            ))}
          </div>

          {tab === 'research' && (
            <div className="flex gap-2">
              <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-md border border-border bg-background">
                <Link size={14} className="text-muted-foreground shrink-0" />
                <input
                  type="url"
                  placeholder="https://example.com/article"
                  value={url}
                  onChange={e => setUrl(e.target.value)}
                  className="flex-1 bg-transparent border-none outline-none text-sm text-foreground placeholder:text-muted-foreground/60"
                  onKeyDown={e => e.key === 'Enter' && handleAddUrl()}
                />
              </div>
              <button
                onClick={handleAddUrl}
                disabled={!url.trim()}
                className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Add URL
              </button>
            </div>
          )}

          {tab === 'file' && (
            <div
              className="flex flex-col items-center justify-center gap-2 p-8 rounded-lg border-2 border-dashed border-border bg-accent/20 cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors text-center"
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="size-11 rounded-lg bg-primary/5 border border-primary/20 flex items-center justify-center text-primary">
                <Upload size={20} />
              </div>
              <p className="text-sm font-bold text-foreground">Upload research file</p>
              <p className="text-xs text-muted-foreground">
                Drag & drop or <span className="text-primary underline underline-offset-2">browse</span>
              </p>
              <div className="flex gap-1.5 mt-1">
                {['.TXT', '.MD', '.DOCX', '.PDF'].map(f => (
                  <span key={f} className="px-2 py-0.5 rounded text-[10px] font-semibold text-muted-foreground border border-border bg-background">{f}</span>
                ))}
              </div>
              <input ref={fileInputRef} type="file" accept={ACCEPTED_TYPES} className="hidden" onChange={handleFileAdd} />
            </div>
          )}
        </div>

        <div className="px-5 py-3 border-t border-border flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-md border border-border bg-background text-xs font-semibold text-foreground hover:bg-accent transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
