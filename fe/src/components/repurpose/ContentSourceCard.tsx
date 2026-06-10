import { useState, useRef } from 'react'
import { FileText, Link2, Upload, File, X, Loader2 } from 'lucide-react'
import { useRepurpose } from '../../context/repurposeContextBase'
import type { SupportingSource } from '../../context/repurposeContextBase'
import { cn } from '@/lib/utils'
import { repurposeApi } from '../../api/repurpose'
import { useWorkspace } from '../../context/WorkspaceContext'
import SourceChip from './SourceChip'
import { MAX_COMBINED_CHARS } from '../../context/RepurposeContext'

const ACCEPTED_TYPES = '.txt,.md'
const MAX_FILE_MB = 5

let sourceIdCounter = 0
function nextSourceId(): string {
  sourceIdCounter += 1
  return `src-${Date.now()}-${sourceIdCounter}`
}

export default function ContentSourceCard() {
  const { config, setConfig, addSource, removeSource, updateSource } = useRepurpose()
  const { activeWorkspace } = useWorkspace()
  const [inputMode, setInputMode] = useState<'text' | 'url' | 'file'>('text')
  const [urlInput, setUrlInput] = useState('')
  const [isFetching, setIsFetching] = useState(false)
  const [isDragging, setIsDragging] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  const charCount = config.sourceText.length
  const wordCount = config.sourceText.trim() ? config.sourceText.trim().split(/\s+/).length : 0
  const readySources = config.sources.filter(s => s.status === 'ready')
  const processingSources = config.sources.filter(s => s.status === 'processing')
  const errorSources = config.sources.filter(s => s.status === 'error')

  const readFileAsText = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => resolve(e.target?.result as string)
      reader.onerror = () => reject(new Error('Failed to read file'))
      reader.readAsText(file, 'utf-8')
    })
  }

  const handleFiles = async (files: FileList) => {
    for (const file of Array.from(files)) {
      if (file.size > MAX_FILE_MB * 1024 * 1024) {
        alert(`"${file.name}" is too large. Max ${MAX_FILE_MB}MB.`)
        continue
      }

      const sourceId = nextSourceId()
      addSource({
        id: sourceId,
        type: 'file',
        label: file.name,
        fileName: file.name,
        status: 'processing',
      })

      try {
        const text = await readFileAsText(file)
        updateSource(sourceId, { status: 'ready', label: text })
      } catch {
        updateSource(sourceId, { status: 'error', error: 'Failed to read file' })
      }
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files)
    }
    e.target.value = ''
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files)
    }
  }

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true) }
  const handleDragLeave = () => setIsDragging(false)

  const handleFetchUrl = async () => {
    if (!urlInput.trim() || !activeWorkspace) return

    const sourceId = nextSourceId()
    addSource({
      id: sourceId,
      type: 'url',
      label: urlInput.trim(),
      url: urlInput.trim(),
      status: 'processing',
    })

    setIsFetching(true)

    try {
      const result = await repurposeApi.fetchUrl(activeWorkspace.id, urlInput.trim())
      const contentBlock = `Title: ${result.title}\n\n${result.content}`
      updateSource(sourceId, { status: 'ready', label: contentBlock })
      setUrlInput('')
    } catch (err) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        || 'Failed to fetch URL content.'
      updateSource(sourceId, { status: 'error', error: message })
    } finally {
      setIsFetching(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isFetching) {
      handleFetchUrl()
    }
  }

  const clearText = () => {
    setConfig(prev => ({ ...prev, sourceText: '' }))
  }

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const combinedChars = config.sourceText.length
    + readySources.reduce((sum, s) => sum + s.label.length, 0)
  const isOverLimit = combinedChars > MAX_COMBINED_CHARS

  const sourceCount = config.sources.length
  const textareaHeightClass = sourceCount === 0
    ? "min-h-[160px]"
    : sourceCount < 3
      ? "min-h-[240px]"
      : "min-h-[320px]"

  const allSources = [...readySources, ...processingSources, ...errorSources]

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden transition-all duration-300">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Content Source</span>
      </div>

      <div className="flex gap-1 px-4 pt-3 border-b border-border">
        {(['text', 'url', 'file'] as const).map(mode => (
          <button
            key={mode}
            onClick={() => setInputMode(mode)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-t-md transition-colors",
              inputMode === mode
                ? "text-foreground bg-background border border-border border-b-background -mb-px"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {mode === 'text' && <FileText size={12} />}
            {mode === 'url' && <Link2 size={12} />}
            {mode === 'file' && <Upload size={12} />}
            {mode === 'text' ? 'Paste Text' : mode === 'url' ? 'From URL' : 'Upload File'}
          </button>
        ))}
        {config.sourceText && inputMode !== 'file' && (
          <button
            onClick={clearText}
            className="ml-auto flex items-center gap-1 px-2 py-2 text-xs text-muted-foreground hover:text-destructive transition-colors"
          >
            <X size={12} />
            Clear
          </button>
        )}
      </div>

      {/* Source chips bar */}
      {allSources.length > 0 && (
        <div className="flex flex-wrap gap-1.5 px-4 py-2 border-b border-border/50 bg-accent/10 max-h-[120px] overflow-y-auto transition-all duration-300">
          {allSources.map(source => (
            <SourceChip key={source.id} source={source} onRemove={removeSource} />
          ))}
        </div>
      )}

      {/* Combined char limit warning */}
      {combinedChars > 0 && (
        <div className={cn(
          "px-4 py-1.5 text-[11px] flex items-center gap-1.5 border-b border-border/50",
          isOverLimit ? "bg-destructive/10 text-destructive" : "text-muted-foreground"
        )}>
          <span>Total: {combinedChars.toLocaleString()} / {MAX_COMBINED_CHARS.toLocaleString()} chars</span>
          {isOverLimit && <span className="font-semibold">— exceeds limit, will be truncated</span>}
        </div>
      )}

      {inputMode === 'text' && (
        <div className="p-4">
          <textarea
            className={cn("w-full bg-transparent border-none text-foreground text-sm leading-relaxed resize-y outline-none placeholder:text-muted-foreground/60 font-body", textareaHeightClass)}
            placeholder="Paste your long-form content here: blog post, video script, email, newsletter..."
            value={config.sourceText}
            onChange={(e) => setConfig(prev => ({ ...prev, sourceText: e.target.value }))}
          />
          <div className="flex justify-end pt-1">
            <span className="flex gap-3 text-xs text-muted-foreground">
              {wordCount > 0 && <span>{wordCount} words</span>}
              <span className={charCount > 5000 ? 'text-destructive font-semibold' : ''}>
                {charCount.toLocaleString()} chars
              </span>
            </span>
          </div>
        </div>
      )}

      {inputMode === 'url' && (
        <div className="flex flex-col gap-3 p-4">
          <div className="flex items-center gap-3">
            <Link2 size={16} className="text-muted-foreground shrink-0" />
            <input
              type="url"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1 bg-transparent border-none outline-none text-foreground text-sm placeholder:text-muted-foreground/60"
              placeholder="https://your-blog-post.com/article"
              disabled={isFetching}
            />
            <button
              onClick={handleFetchUrl}
              disabled={isFetching || !urlInput.trim()}
              className="px-3 py-1.5 rounded-md border border-border bg-background text-foreground text-xs font-semibold hover:bg-accent transition-colors whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
            >
              {isFetching ? (
                <><Loader2 size={11} className="animate-spin" /> Fetching...</>
              ) : (
                'Fetch Content'
              )}
            </button>
          </div>
          <p className="text-[10px] text-muted-foreground/60">
            URLs are fetched server-side with a 10-second timeout.
          </p>
        </div>
      )}

      {inputMode === 'file' && (
        <div className="p-4">
          <div
            className={cn(
              "flex flex-col items-center justify-center gap-2 p-8 rounded-lg border-2 border-dashed border-border bg-accent/20 cursor-pointer transition-colors text-center",
              isDragging ? "border-primary bg-primary/5 shadow-[0_0_0_3px_rgba(139,92,246,0.06)]" : "hover:border-primary hover:bg-primary/5"
            )}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="size-11 rounded-lg bg-primary/5 border border-primary/20 flex items-center justify-center text-primary mb-1 transition-transform group-hover:-translate-y-0.5">
              <Upload size={20} />
            </div>
            <p className="text-sm font-bold text-foreground">Drag & drop files here</p>
            <p className="text-xs text-muted-foreground">
              or <span className="text-primary underline underline-offset-2 cursor-pointer">browse from your computer</span>
            </p>
            <div className="flex gap-1.5 mt-1">
              {['.TXT', '.MD'].map(f => (
                <span key={f} className="px-2 py-0.5 rounded text-[10px] font-semibold text-muted-foreground border border-border bg-background">
                  {f}
                </span>
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground/60">Max file size: {MAX_FILE_MB}MB each</p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={ACCEPTED_TYPES}
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
      )}

    </div>
  )
}
