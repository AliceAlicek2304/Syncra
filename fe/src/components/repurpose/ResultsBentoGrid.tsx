import { useState, useRef, useEffect } from 'react'
import { AlertCircle, Download, Sparkles, Loader2, Lightbulb } from 'lucide-react'
import { useRepurpose } from '../../context/repurposeContextBase'
import type { RepurposePlatform, AtomType, RepurposeAtom } from '../../context/repurposeContextBase'
import { ZERNIO_PLATFORMS } from '../../data/platforms'
import { ExtendedPlatformIcon } from '../create-post/platformIcons'
import ResultCard from './ResultCard'
import { cn } from '@/lib/utils'

interface ResultsBentoGridProps {
  onCreatePostToolbar?: (content: string) => void
}

const CORE_TYPES: AtomType[] = ['POST', 'THREAD', 'CAROUSEL', 'INSIGHT']
const INSIGHT_TYPES: AtomType[] = ['TIP', 'QUOTE']

function SkeletonCard() {
  return (
    <div className="bg-card border border-border rounded-lg p-[18px] flex flex-col gap-3 overflow-hidden">
      <div className="flex gap-2">
        <div className="h-5 w-20 rounded bg-gradient-to-r from-muted/30 via-muted/50 to-muted/30 bg-[length:200%_auto] animate-pulse" />
        <div className="h-5 w-14 rounded bg-gradient-to-r from-muted/30 via-muted/50 to-muted/30 bg-[length:200%_auto] animate-pulse" />
      </div>
      <div className="h-3 w-[65%] rounded bg-gradient-to-r from-muted/20 via-muted/40 to-muted/20 bg-[length:200%_auto] animate-pulse" />
      <div className="h-3 w-full rounded bg-gradient-to-r from-muted/20 via-muted/40 to-muted/20 bg-[length:200%_auto] animate-pulse" />
      <div className="h-3 w-full rounded bg-gradient-to-r from-muted/20 via-muted/40 to-muted/20 bg-[length:200%_auto] animate-pulse" />
      <div className="h-3 w-[80%] rounded bg-gradient-to-r from-muted/20 via-muted/40 to-muted/20 bg-[length:200%_auto] animate-pulse" />
      <div className="h-3 w-[45%] rounded bg-gradient-to-r from-muted/20 via-muted/40 to-muted/20 bg-[length:200%_auto] animate-pulse" />
    </div>
  )
}

function LiveTokenPreview({ text }: { text: string }) {
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [text])

  if (!text) return null

  return (
    <div className="rounded-lg border border-primary/20 bg-primary/[0.02] overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-primary/10 bg-primary/[0.03]">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
        </span>
        <span className="text-xs font-bold text-foreground/70 uppercase tracking-wider">AI đang suy nghĩ</span>
      </div>
      <div
        ref={scrollRef}
        className="max-h-[120px] overflow-y-auto p-3 font-mono text-xs text-muted-foreground/80 leading-relaxed whitespace-pre-wrap break-words"
      >
        {text}
        <span className="inline-block w-[2px] h-[14px] bg-primary ml-0.5 animate-pulse align-text-bottom" />
      </div>
    </div>
  )
}

function PartialResultCard({ atom }: { atom: RepurposeAtom }) {
  return (
    <div className="relative bg-card border border-border rounded-lg p-[18px] pb-4 pl-[22px] flex flex-col gap-2.5 overflow-hidden">
      <div className="absolute left-0 top-0 w-[3px] h-full rounded-l-lg opacity-40" style={{ background: '#a78bfa' }} />
      <div className="flex gap-1.5 flex-wrap items-center">
        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded border uppercase tracking-wide text-muted-foreground border-border">
          <ExtendedPlatformIcon platform={atom.platform as RepurposePlatform} size={12} />
          {atom.platform}
        </span>
        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded border uppercase tracking-wide text-primary border-primary/20 bg-primary/5">
          <Loader2 size={10} className="animate-spin" />
          Generating...
        </span>
      </div>
      <div className="space-y-2">
        {atom.title && <div className="h-4 w-[60%] rounded bg-gradient-to-r from-muted/30 via-muted/50 to-muted/30 bg-[length:200%_auto] animate-pulse" />}
        <div className="space-y-1">
          {atom.content ? (
            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap line-clamp-5">
              {atom.content}
            </p>
          ) : (
            <>
              <div className="h-3 w-full rounded bg-gradient-to-r from-muted/20 via-muted/40 to-muted/20 bg-[length:200%_auto] animate-pulse" />
              <div className="h-3 w-[85%] rounded bg-gradient-to-r from-muted/20 via-muted/40 to-muted/20 bg-[length:200%_auto] animate-pulse" />
              <div className="h-3 w-[60%] rounded bg-gradient-to-r from-muted/20 via-muted/40 to-muted/20 bg-[length:200%_auto] animate-pulse" />
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default function ResultsBentoGrid({ onCreatePostToolbar }: ResultsBentoGridProps) {
  const { results, isGenerating, streamState, error } = useRepurpose()
  const [activeFilter, setActiveFilter] = useState<RepurposePlatform | 'All'>('All')

  const coreResults = results.filter(r => CORE_TYPES.includes(r.type))
  const extractedInsights = results.filter(r => INSIGHT_TYPES.includes(r.type))

  const partialAtoms = Object.values(streamState.partialResults).flat()
  const partialCore = partialAtoms.filter(r => CORE_TYPES.includes(r.type))
  const partialInsights = partialAtoms.filter(r => INSIGHT_TYPES.includes(r.type))

  const usedPlatforms = Array.from(new Set(coreResults.map(r => r.platform))) as RepurposePlatform[]
  const filterTabs = ['All', ...usedPlatforms] as (RepurposePlatform | 'All')[]

  const filteredCore = activeFilter === 'All' ? coreResults : coreResults.filter(r => r.platform === activeFilter)
  const filteredInsights = activeFilter === 'All' ? extractedInsights : extractedInsights.filter(r => r.platform === activeFilter)

  const filteredPartialCore = activeFilter === 'All' ? partialCore : partialCore.filter(r => r.platform === activeFilter)
  const filteredPartialInsights = activeFilter === 'All' ? partialInsights : partialInsights.filter(r => r.platform === activeFilter)

  const hasPartial = partialAtoms.length > 0
  const hasResults = results.length > 0 || hasPartial

  const handleCreatePost = (content: string) => {
    onCreatePostToolbar?.(content)
  }

  const handleExport = () => {
    const text = results.map(a =>
      `[${a.platform} - ${a.type}]${a.title ? '\n' + a.title : ''}\n${a.content}\n${a.suggestedHashtags.join(' ')}`
    ).join('\n\n---\n\n')
    const blob = new Blob([text], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'repurposed-content.txt'
    a.click()
    URL.revokeObjectURL(url)
  }

  const getPlatformMeta = (p: string) => {
    const found = ZERNIO_PLATFORMS.find(x => x.id === p)
    return { color: found?.color ?? '#a78bfa' }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Sparkles size={14} className="text-primary" />
          {isGenerating ? (
            <span className="bg-gradient-to-r from-muted-foreground via-primary to-muted-foreground bg-[length:200%_auto] animate-pulse bg-clip-text text-transparent font-semibold">
              {hasPartial ? 'Generating content...' : 'AI is analyzing content...'}
            </span>
          ) : (
            <span className="text-muted-foreground">
              <strong className="text-foreground">{results.length}</strong> content pieces generated
            </span>
          )}
        </div>

        {streamState.isStreaming && (
          <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden max-w-[200px]">
            <div className="h-full rounded-full bg-primary transition-all duration-300" style={{ width: `${streamState.progress * 100}%` }} />
          </div>
        )}

        {(results.length > 0 || hasPartial) && (
          <div className="flex gap-0.5 rounded-md border border-border bg-muted p-0.5">
            {filterTabs.map(p => {
              const meta = getPlatformMeta(p)
              const count = p === 'All' ? coreResults.length : coreResults.filter(r => r.platform === p).length
              const isStreamingPlatform = streamState.isStreaming && p !== 'All' && streamState.platformResults[p]
              return (
                <button
                  key={p}
                  onClick={() => setActiveFilter(p)}
                  style={activeFilter === p ? { '--tab-color': meta.color } as React.CSSProperties : {}}
                  className={cn(
                    "flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-semibold transition-all whitespace-nowrap",
                    activeFilter === p
                      ? "bg-background text-[var(--tab-color)] shadow-sm"
                      : "text-brand-body hover:text-foreground"
                  )}
                >
                  {p !== 'All' && <ExtendedPlatformIcon platform={p} size={12} />}
                  <span>{p === 'All' ? 'All' : p} ({count})</span>
                  {isStreamingPlatform && <Loader2 size={10} className="animate-spin" />}
                </button>
              )
            })}
          </div>
        )}

        {(results.length > 0 || hasPartial) && (
          <button
            onClick={handleExport}
            className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border bg-background text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-accent transition-all"
          >
            <Download size={12} />
            Export All
          </button>
        )}
      </div>

      {!isGenerating && error && (
        <div className="flex items-start gap-3 p-3.5 rounded-lg border border-destructive/30 bg-destructive/5 animate-in fade-in">
          <AlertCircle size={16} className="text-destructive shrink-0 mt-0.5" />
          <div className="flex flex-col gap-0.5">
            <span className="text-xs font-bold text-destructive">Content generation failed</span>
            <span className="text-xs text-muted-foreground">{error}</span>
          </div>
        </div>
      )}

      {isGenerating && !hasPartial && filteredCore.length === 0 ? (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map(i => <SkeletonCard key={i} />)}
        </div>
      ) : (
        <>
          {isGenerating && <LiveTokenPreview text={streamState.liveTokenText} />}

          {(filteredCore.length > 0 || filteredPartialCore.length > 0) && (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {filteredCore.map((atom, i) => (
                <ResultCard key={atom.id} atom={atom} index={i} onCreatePostToolbar={handleCreatePost} />
              ))}
              {filteredPartialCore.map((atom) => (
                <PartialResultCard key={`partial-${atom.id}`} atom={atom} />
              ))}
            </div>
          )}

          {(filteredInsights.length > 0 || filteredPartialInsights.length > 0) && (
            <div className="flex flex-col gap-4 mt-2">
              <div className="flex items-center gap-3 py-1">
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
                <Lightbulb size={14} className="text-primary shrink-0" />
                <span className="text-xs font-bold text-foreground uppercase tracking-widest">Extracted Insights</span>
                <span className="text-xs font-semibold text-muted-foreground">({filteredInsights.length + filteredPartialInsights.length})</span>
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
              </div>
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                {filteredInsights.map((atom, i) => (
                  <ResultCard key={atom.id} atom={atom} index={i} variant="insight" onCreatePostToolbar={handleCreatePost} />
                ))}
                {filteredPartialInsights.map((atom) => (
                  <PartialResultCard key={`partial-${atom.id}`} atom={atom} />
                ))}
              </div>
            </div>
          )}

          {!hasResults && !isGenerating && (
            <div className="flex flex-col items-center justify-center gap-3 p-12 text-center">
              <Sparkles size={28} className="text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">No results yet. Click "Start Repurpose Engine" to begin.</p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
