import { Lightbulb, Image as ImageIcon, Video as VideoIcon } from 'lucide-react'
import { useRepurpose } from '../../context/repurposeContextBase'
import { cn } from '@/lib/utils'

const TONES = [
  { id: 'default', label: 'Adaptive' },
  { id: 'professional', label: 'Professional' },
  { id: 'casual', label: 'Casual' },
  { id: 'bold', label: 'Bold' },
  { id: 'educational', label: 'Educational' },
]

const LENGTHS = [
  { id: 'short', label: 'Ngắn' },
  { id: 'medium', label: 'Vừa' },
  { id: 'long', label: 'Dài' },
]

const LANGUAGES = [
  { id: 'en', label: 'English' },
  { id: 'vi', label: 'Tiếng Việt' },
]

export default function AISettingsCard() {
  const { config, setConfig } = useRepurpose()

  const isYouTubeSelected = config.targetPlatforms.includes('youtube')
  const isGoogleBusinessSelected = config.targetPlatforms.includes('googlebusiness')

  const handleToggleMedia = () => {
    setConfig(prev => {
      const nextGenerateMedia = !prev.generateMedia
      let nextMediaType = prev.mediaType
      if (nextGenerateMedia && !nextMediaType) {
        // Default selection based on current platform constraints
        const hasYouTube = prev.targetPlatforms.includes('youtube')
        nextMediaType = hasYouTube ? 'video' : 'image'
      }
      
      // If we are turning media generation ON, limit platforms to 1 if there were more
      let nextPlatforms = prev.targetPlatforms
      if (nextGenerateMedia && prev.targetPlatforms.length > 1) {
        nextPlatforms = [prev.targetPlatforms[0]]
      }

      return {
        ...prev,
        generateMedia: nextGenerateMedia,
        mediaType: nextMediaType,
        targetPlatforms: nextPlatforms,
      }
    })
  }

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-border">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">AI Settings</span>
      </div>

      <div className="p-4 flex flex-col gap-5">
        <div className="flex flex-col gap-2.5">
          <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Tone</span>
          <div className="flex flex-wrap gap-1.5">
            {TONES.map(t => (
              <button
                key={t.id}
                onClick={() => setConfig(prev => ({ ...prev, tone: t.id }))}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-semibold border transition-all",
                  config.tone === t.id
                    ? "bg-foreground text-background border-foreground"
                    : "bg-background text-muted-foreground border-border hover:border-muted-foreground/30 hover:text-foreground"
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-6">
          <div className="flex flex-col gap-2.5">
            <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Length</span>
            <div className="flex gap-1.5">
              {LENGTHS.map(l => (
                <button
                  key={l.id}
                  onClick={() => setConfig(prev => ({ ...prev, contentLength: l.id }))}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs font-semibold border transition-all",
                    config.contentLength === l.id
                      ? "bg-foreground text-background border-foreground"
                      : "bg-background text-muted-foreground border-border hover:border-muted-foreground/30 hover:text-foreground"
                  )}
                >
                  {l.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2.5">
            <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Language</span>
            <div className="flex gap-1.5">
              {LANGUAGES.map(l => (
                <button
                  key={l.id}
                  onClick={() => setConfig(prev => ({ ...prev, language: l.id }))}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs font-semibold border transition-all",
                    config.language === l.id
                      ? "bg-foreground text-background border-foreground"
                      : "bg-background text-muted-foreground border-border hover:border-muted-foreground/30 hover:text-foreground"
                  )}
                >
                  {l.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="pt-1 border-t border-border/50">
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <div
              className={cn(
                "relative w-9 h-5 rounded-full border transition-all shrink-0",
                config.extractAtoms
                  ? "bg-primary border-primary shadow-[0_2px_8px_rgba(139,92,246,0.15)]"
                  : "bg-accent/10 border-border"
              )}
              onClick={() => setConfig(prev => ({ ...prev, extractAtoms: !prev.extractAtoms }))}
            >
              <div
                className={cn(
                  "absolute top-0.5 left-0.5 size-[14px] rounded-full bg-white border border-border/30 shadow transition-transform duration-200",
                  config.extractAtoms && "translate-x-4"
                )}
              />
            </div>
            <div>
              <div className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                <Lightbulb size={13} className="text-primary" />
                Extract Insights
              </div>
              <div className="text-[11px] text-muted-foreground">Tips, quotes, key insights</div>
            </div>
          </label>
        </div>

        {/* Media Generation Option */}
        <div className="pt-3 border-t border-border/50 flex flex-col gap-3">
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <div
              className={cn(
                "relative w-9 h-5 rounded-full border transition-all shrink-0",
                config.generateMedia
                  ? "bg-primary border-primary shadow-[0_2px_8px_rgba(139,92,246,0.15)]"
                  : "bg-accent/10 border-border"
              )}
              onClick={handleToggleMedia}
            >
              <div
                className={cn(
                  "absolute top-0.5 left-0.5 size-[14px] rounded-full bg-white border border-border/30 shadow transition-transform duration-200",
                  config.generateMedia && "translate-x-4"
                )}
              />
            </div>
            <div>
              <div className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                <ImageIcon size={13} className="text-primary" />
                Tạo Media từ bài viết
              </div>
              <div className="text-[11px] text-muted-foreground">Tự động tạo hình ảnh hoặc video ngắn từ bài viết</div>
            </div>
          </label>

          {config.generateMedia && (
            <div className="pl-12 flex flex-col gap-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Định dạng Media</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={isYouTubeSelected}
                  onClick={() => setConfig(prev => ({ ...prev, mediaType: 'image' }))}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg border text-xs font-semibold transition-all select-none",
                    config.mediaType === 'image'
                      ? "bg-primary/10 text-primary border-primary"
                      : "bg-background text-muted-foreground border-border hover:border-muted-foreground/30 hover:text-foreground",
                    isYouTubeSelected && "opacity-40 cursor-not-allowed"
                  )}
                  title={isYouTubeSelected ? "YouTube không hỗ trợ định dạng hình ảnh" : "Tạo ảnh với gemini-3.1-flash-image"}
                >
                  <ImageIcon size={14} />
                  <span>Tạo Ảnh</span>
                </button>

                <button
                  type="button"
                  disabled={isGoogleBusinessSelected}
                  onClick={() => setConfig(prev => ({ ...prev, mediaType: 'video' }))}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg border text-xs font-semibold transition-all select-none",
                    config.mediaType === 'video'
                      ? "bg-primary/10 text-primary border-primary"
                      : "bg-background text-muted-foreground border-border hover:border-muted-foreground/30 hover:text-foreground",
                    isGoogleBusinessSelected && "opacity-40 cursor-not-allowed"
                  )}
                  title={isGoogleBusinessSelected ? "Google Business không hỗ trợ định dạng video" : "Tạo video với veo-3.1-lite-generate-preview"}
                >
                  <VideoIcon size={14} />
                  <span>Tạo Video</span>
                </button>
              </div>
              {isYouTubeSelected && (
                <span className="text-[10px] text-amber-500 font-medium">YouTube chỉ hỗ trợ định dạng Video</span>
              )}
              {isGoogleBusinessSelected && (
                <span className="text-[10px] text-amber-500 font-medium">Google Business chỉ hỗ trợ định dạng Hình ảnh</span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
