import { useRepurpose } from '../../context/repurposeContextBase'
import type { RepurposePlatform } from '../../context/repurposeContextBase'
import { ZERNIO_PLATFORMS, getPlatformStyle } from '../../data/platforms'
import { ExtendedPlatformIcon } from '../create-post/platformIcons'
import { cn } from '@/lib/utils'

export default function PlatformSelector() {
  const { config, setConfig } = useRepurpose()

  const togglePlatform = (p: RepurposePlatform) => {
    setConfig(prev => {
      const active = prev.targetPlatforms.includes(p)
      
      let next: RepurposePlatform[]
      if (prev.generateMedia) {
        // Limit to at most 1 platform when media generation is active
        next = active ? [] : [p]
      } else {
        next = active
          ? prev.targetPlatforms.filter(t => t !== p)
          : [...prev.targetPlatforms, p]
      }

      // Automatically adjust media type based on new platform constraints
      let nextMediaType = prev.mediaType
      if (prev.generateMedia && next.length > 0) {
        const platform = next[0]
        if (platform === 'youtube') {
          nextMediaType = 'video'
        } else if (platform === 'googlebusiness') {
          nextMediaType = 'image'
        } else if (!nextMediaType) {
          nextMediaType = 'image' // Default to image
        }
      }

      return {
        ...prev,
        targetPlatforms: next,
        mediaType: nextMediaType,
      }
    })
  }

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Target Platforms</span>
        <span className={cn(
          "text-xs font-semibold",
          config.targetPlatforms.length > 0 ? "text-primary" : "text-muted-foreground"
        )}>
          {config.targetPlatforms.length > 0
            ? `${config.targetPlatforms.length} selected`
            : 'Select at least 1'}
        </span>
      </div>

      <div className="p-4 grid grid-cols-2 gap-2">
        {ZERNIO_PLATFORMS.map(p => {
          const isActive = config.targetPlatforms.includes(p.id as RepurposePlatform)
          const style = getPlatformStyle(p.id)
          return (
            <button
              key={p.id}
              onClick={() => togglePlatform(p.id as RepurposePlatform)}
              style={isActive ? {
                '--p-color': style.color,
                '--p-bg': style.bg,
                '--p-border': style.border,
              } as React.CSSProperties : {}}
              className={cn(
                "flex items-center gap-2.5 px-3 py-2.5 rounded-md text-xs font-semibold border transition-all text-left",
                isActive
                  ? "[color:var(--p-color)] [background:var(--p-bg)] [border-color:var(--p-border)] shadow-sm"
                  : "bg-background text-muted-foreground border-border hover:border-muted-foreground/30 hover:text-foreground"
              )}
            >
              <ExtendedPlatformIcon platform={p.id} size={14} />
              <span className="flex-1">{p.id}</span>
              {isActive && (
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="shrink-0">
                  <path d="M3 6l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
