import { useState, useEffect } from 'react'
import { Sparkles, Zap, Layers, AlertTriangle, X, Loader2 } from 'lucide-react'
import { ZERNIO_PLATFORMS } from '../../data/platforms'
import { useRepurpose } from '../../context/repurposeContextBase'
import { useCreatePostModal } from '../../context/createPostModalContext'
import { useBilling } from '../../context/BillingContext'
import SubscriptionUpgradeModal from '../../components/SubscriptionUpgradeModal'
import ContentSourceCard from '../../components/repurpose/ContentSourceCard'
import AISettingsCard from '../../components/repurpose/AISettingsCard'
import PlatformSelector from '../../components/repurpose/PlatformSelector'
import ResultsBentoGrid from '../../components/repurpose/ResultsBentoGrid'
import GenerationHistoryTable from '../../components/repurpose/GenerationHistoryTable'
import { DeleteSessionConfirmDialog } from '../../components/repurpose/DeleteSessionConfirmDialog'

export default function RepurposePage() {
  const { config, isGenerating, generate, error, setError, sessions, activeSessionId, switchSession, deleteSession, results } = useRepurpose()
  const { openCreatePost } = useCreatePostModal()
  const { subscription, loading: billingLoading, loadCurrentSubscription } = useBilling()
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false)
  const hasValidSubscription = subscription?.status === 'Active' || subscription?.status === 'Trialing'
  const isSubscriptionKnown = subscription !== null
  const hasOutput = results.length > 0 || isGenerating
  const hasReadySources = config.sources.some(s => s.status === 'ready')
  const hasInputContent = config.sourceText.trim().length > 0 || hasReadySources
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)

  useEffect(() => {
    if (!subscription && !billingLoading) {
      loadCurrentSubscription()
    }
  }, [])

  const handleDeleteConfirm = async () => {
    if (deleteTargetId) {
      await deleteSession(deleteTargetId)
      setDeleteTargetId(null)
    }
  }

  const handleGenerate = async () => {
    if (!hasInputContent) return
    if (isSubscriptionKnown && !hasValidSubscription) {
      setIsUpgradeModalOpen(true)
      return
    }
    await generate()
  }

  const handleCreatePost = (content: string, platform: string, mediaUrl?: string, mediaType?: 'image' | 'video' | null) => {
    if (isSubscriptionKnown && !hasValidSubscription) {
      setIsUpgradeModalOpen(true)
      return
    }
    let mediaName = 'AI_Media'
    if (mediaUrl) {
      const ext = mediaUrl.split('.').pop()?.split('?')[0]
      if (ext && ['png', 'jpg', 'jpeg', 'gif', 'webp', 'mp4', 'mov', 'webm'].includes(ext.toLowerCase())) {
        mediaName = `AI_Media.${ext}`
      } else {
        mediaName = mediaType === 'video' ? 'AI_Media.mp4' : 'AI_Media.png'
      }
    }
    openCreatePost({
      initialContent: content,
      source: 'repurpose',
      initialPlatform: platform,
      initialMedia: mediaUrl ? [{ url: mediaUrl, type: mediaType === 'video' ? 'video' : 'image', name: mediaName }] : undefined
    })
  }

  return (
    <div className="flex-1 flex flex-col p-6 lg:p-8 gap-6 overflow-y-auto overflow-x-hidden bg-background text-foreground">
      <div className="flex items-start justify-between flex-wrap gap-4 z-[1]">
        <div className="flex flex-col gap-2">
          <h1 className="text-[28px] font-bold text-foreground font-title leading-tight tracking-tight">Repurpose</h1>
          <p className="text-sm text-muted-foreground max-w-[520px] leading-relaxed">
            Transform long-form content into multi-platform posts — optimized tone, optimized per channel.
          </p>
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          {[
            { icon: Layers, text: `${ZERNIO_PLATFORMS.length} Platforms` },
            { icon: Zap, text: '6 Content Types' },
            { icon: Sparkles, text: 'AI-Optimized' },
          ].map((chip, i) => (
            <div key={i} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-card border border-border text-xs font-semibold text-muted-foreground">
              <chip.icon size={12} className="text-primary" />
              {chip.text}
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-6 flex-1 min-h-0">
        {/* Left Panel — Content Input + Settings */}
        <div className="w-[420px] flex-shrink-0 flex flex-col gap-4">
          <ContentSourceCard />
          <AISettingsCard />
          <PlatformSelector />

          <div className="sticky bottom-0 pt-2">
            <button
              onClick={handleGenerate}
              disabled={!hasInputContent || isGenerating || config.targetPlatforms.length === 0}
              className="relative w-full flex items-center justify-center gap-2.5 py-3 px-6 rounded-lg bg-primary text-primary-foreground text-sm font-bold border-none cursor-pointer transition-all overflow-hidden hover:bg-primary/90 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-primary"
            >
              {isGenerating ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Sparkles size={16} />
              )}
              <span>{isGenerating ? 'Analyzing & generating content...' : 'Start Repurpose Engine'}</span>
            </button>
            {config.targetPlatforms.length === 0 && (
              <p className="text-xs text-destructive text-center mt-1.5 font-medium">Please select at least 1 platform</p>
            )}
          </div>
        </div>

        {/* Right Panel — Results + History */}
          <div className="flex-1 flex flex-col gap-6 min-w-0">
            {hasOutput ? (
              <ResultsBentoGrid onCreatePostToolbar={handleCreatePost} />
            ) : (
            <div className="flex flex-col items-center justify-center gap-4 p-16 text-center relative rounded-lg border border-dashed border-border bg-card overflow-hidden">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-gradient-to-br from-primary/[0.03] to-transparent rounded-full pointer-events-none" />
              <Sparkles size={36} className="text-primary" />
              <p className="text-lg font-bold text-foreground">Your results will appear here</p>
              <p className="text-sm text-muted-foreground max-w-[440px] leading-relaxed">
                Paste your content, choose target platforms, and click <strong className="text-primary font-semibold">Start Engine</strong> to let AI analyze & generate content.
              </p>
              <div className="flex gap-2 flex-wrap justify-center mt-1">
                {['Blog post', 'YouTube Script', 'Newsletter', 'Podcast Notes', 'Article'].map(f => (
                  <span key={f} className="px-3 py-1 rounded-full border border-border text-xs text-muted-foreground bg-background">{f}</span>
                ))}
              </div>
            </div>
          )}

          <GenerationHistoryTable
            sessions={sessions}
            activeSessionId={activeSessionId}
            onSwitch={switchSession}
            onDelete={setDeleteTargetId}
          />
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2.5 px-4 py-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm animate-in slide-in-from-top-2 duration-200 fixed bottom-6 right-6 z-50 shadow-lg backdrop-blur-md">
          <AlertTriangle size={14} />
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-auto bg-none border-none text-destructive cursor-pointer p-0.5 opacity-70 hover:opacity-100 transition-opacity">
            <X size={12} />
          </button>
        </div>
      )}

      <DeleteSessionConfirmDialog
        open={deleteTargetId !== null}
        onCancel={() => setDeleteTargetId(null)}
        onConfirm={handleDeleteConfirm}
      />

      <SubscriptionUpgradeModal
        isOpen={isUpgradeModalOpen}
        onClose={() => setIsUpgradeModalOpen(false)}
      />
    </div>
  )
}
