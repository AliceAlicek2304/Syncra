import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import {
  Sparkles, Zap, Layers, AlertTriangle, X, Loader2, Search, ArrowRight, ArrowLeft,
  History, Send, Calendar, ChevronDown, Trash2, Settings2, Settings, Lightbulb,
  Image as ImageIcon, Video as VideoIcon, Hash, FileText, Link2, UploadCloud, Plus,
  CheckCircle2, Type, Text
} from 'lucide-react'
import { ZERNIO_PLATFORMS, getPlatformStyle } from '../../data/platforms'
import type { RepurposePlatform } from '../../context/repurposeContextBase'
import { useRepurpose } from '../../context/repurposeContextBase'
import { useCreatePostModal } from '../../context/createPostModalContext'
import { useBilling } from '../../context/BillingContext'
import SubscriptionUpgradeModal from '../../components/SubscriptionUpgradeModal'
import ResultsBentoGrid from '../../components/repurpose/ResultsBentoGrid'
import { DeleteSessionConfirmDialog } from '../../components/repurpose/DeleteSessionConfirmDialog'
import { useWorkspace } from '../../context/WorkspaceContext'
import { repurposeApi } from '../../api/repurpose'
import { postsApi, type Post } from '../../api/posts'
import { cn } from '@/lib/utils'
import SourceChip from '../../components/repurpose/SourceChip'
import { ExtendedPlatformIcon } from '../../components/create-post/platformIcons'




export default function RepurposePage() {
  const { config, setConfig, addSource, removeSource, updateSource, generate, error, setError, sessions, activeSessionId, switchSession, deleteSession, resetCurrentWork, results } = useRepurpose()
  const { openCreatePost } = useCreatePostModal()
  const { subscription, loading: billingLoading, loadCurrentSubscription } = useBilling()
  const { activeWorkspace } = useWorkspace()

  // App Layout States
  const [currentStep, setCurrentStep] = useState<number>(1)
  const [maxStepReached, setMaxStepReached] = useState<number>(1)
  const [inputMode, setInputMode] = useState<'paste' | 'url' | 'upload' | 'post'>('paste')
  const [urlInput, setUrlInput] = useState('')
  const [isFetchingUrl, setIsFetchingUrl] = useState(false)
  const [isDraggingFile, setIsDraggingFile] = useState(false)
  const [platformSearch, setPlatformSearch] = useState('')
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false)
  const [isHistoryOpen, setIsHistoryOpen] = useState(false)
  const [isPostsOpen, setIsPostsOpen] = useState(false)
  const [toastMsg, setToastMsg] = useState<string | null>(null)
  
  // Workspace Posts State for the "My Posts" drawer & selection
  const [workspacePosts, setWorkspacePosts] = useState<Post[]>([])
  const [isLoadingPosts, setIsLoadingPosts] = useState(false)
  const [postsSearchQuery, setPostsSearchQuery] = useState('')

  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false)
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const hasValidSubscription = subscription?.status === 'Active' || subscription?.status === 'Trialing'
  const isSubscriptionKnown = subscription !== null

  // Helpers for ID generation
  const sourceIdRef = useRef(0)
  const nextSourceId = useCallback(() => {
    sourceIdRef.current += 1
    return `src-${Date.now()}-${sourceIdRef.current}`
  }, [])

  // Auto load subscription
  useEffect(() => {
    if (!subscription && !billingLoading) {
      loadCurrentSubscription()
    }
  }, [subscription, billingLoading, loadCurrentSubscription])

  // Fetch workspace posts
  const fetchWorkspacePosts = useCallback(async () => {
    if (!activeWorkspace) return
    setIsLoadingPosts(true)
    try {
      const res = await postsApi.getPosts(activeWorkspace.id, { page: 1, pageSize: 50 })
      setWorkspacePosts(res.items || [])
    } catch (err) {
      console.error('Failed to fetch workspace posts:', err)
    } finally {
      setIsLoadingPosts(false)
    }
  }, [activeWorkspace])

  useEffect(() => {
    if (activeWorkspace) {
      fetchWorkspacePosts()
    }
  }, [activeWorkspace, fetchWorkspacePosts])

  // Auto transition to step 3 when results load on session switch
  useEffect(() => {
    if (results.length > 0 && currentStep === 1) {
      setCurrentStep(3)
      setMaxStepReached(prev => Math.max(prev, 3))
    }
  }, [results])

  const showToast = (msg: string) => {
    setToastMsg(msg)
    setTimeout(() => setToastMsg(null), 3000)
  }

  // File Upload Handlers
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
      if (file.size > 5 * 1024 * 1024) {
        showToast(`File "${file.name}" quá lớn. Tối đa 5MB.`)
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
        showToast(`Tải lên file "${file.name}" thành công!`)
      } catch {
        updateSource(sourceId, { status: 'error', error: 'Không thể đọc file' })
      }
    }
  }

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
    setIsFetchingUrl(true)
    try {
      const result = await repurposeApi.fetchUrl(activeWorkspace.id, urlInput.trim())
      const contentBlock = `Title: ${result.title}\n\n${result.content}`
      updateSource(sourceId, { status: 'ready', label: contentBlock })
      setUrlInput('')
      showToast('Trích xuất URL thành công!')
    } catch (err) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        || 'Không thể trích xuất URL.'
      updateSource(sourceId, { status: 'error', error: message })
    } finally {
      setIsFetchingUrl(false)
    }
  }

  const handleTogglePost = (post: Post) => {
    const existing = config.sources.find(s => s.type === 'post' && s.postId === post.id)
    if (existing) {
      removeSource(existing.id)
    } else {
      addSource({
        id: nextSourceId(),
        type: 'post',
        label: post.title || post.content?.slice(0, 30) || 'Untitled Post',
        postId: post.id,
        status: 'ready',
      })
      showToast('Đã chọn bài đăng làm nguồn!')
    }
  }



  const handleGenerate = async () => {
    if (!hasInputContent) return
    if (isSubscriptionKnown && !hasValidSubscription) {
      setIsUpgradeModalOpen(true)
      return
    }
    setCurrentStep(3)
    setMaxStepReached(3)
    await generate()
  }

  const handleDeleteConfirm = async () => {
    if (deleteTargetId) {
      await deleteSession(deleteTargetId)
      setDeleteTargetId(null)
      goToStep(1)
      showToast('Đã xoá phiên làm việc.')
    }
  }

  const handleClearCurrentResults = () => {
    if (activeSessionId) {
      setDeleteTargetId(activeSessionId)
      return
    }

    resetCurrentWork()
    goToStep(1)
  }

  const handleStartNewRepurpose = () => {
    resetCurrentWork()
    goToStep(1)
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
    
    // Refresh posts drawer lists after modal actions
    setTimeout(() => {
      fetchWorkspacePosts()
    }, 2000)
  }

  // Navigation helpers
  const goToStep = (step: number) => {
    setCurrentStep(step)
    setMaxStepReached(prev => Math.max(prev, step))
  }

  // Calculations
  const readySources = config.sources.filter(s => s.status === 'ready')
  const processingSources = config.sources.filter(s => s.status === 'processing')
  const errorSources = config.sources.filter(s => s.status === 'error')
  const allSources = [...readySources, ...processingSources, ...errorSources]
  const hasReadySources = config.sources.some(s => s.status === 'ready')
  const hasInputContent = config.sourceText.trim().length > 0 || hasReadySources
  const wordCount = config.sourceText.trim() ? config.sourceText.trim().split(/\s+/).length : 0
  const combinedChars = config.sourceText.length + readySources.reduce((sum, s) => sum + s.label.length, 0)
  const estPosts = useMemo(() => {
    if (combinedChars > 100) {
      return Math.min(6, Math.max(1, Math.round(combinedChars / 400)))
    }
    return 0
  }, [combinedChars])

  // Filtered lists
  const filteredWorkspacePosts = workspacePosts.filter(post => {
    const q = postsSearchQuery.toLowerCase()
    return (
      post.title?.toLowerCase().includes(q) ||
      post.content?.toLowerCase().includes(q)
    )
  })

  const filteredPlatforms = ZERNIO_PLATFORMS.filter(p =>
    p.label.toLowerCase().includes(platformSearch.toLowerCase()) ||
    p.id.toLowerCase().includes(platformSearch.toLowerCase())
  )

  const togglePlatform = (p: RepurposePlatform) => {
    setConfig(prev => {
      const active = prev.targetPlatforms.includes(p)
      let next: RepurposePlatform[]
      if (prev.generateMedia) {
        next = active ? [] : [p]
      } else {
        next = active ? prev.targetPlatforms.filter(t => t !== p) : [...prev.targetPlatforms, p]
      }
      return { ...prev, targetPlatforms: next }
    })
  }

  const isYouTubeSelected = config.targetPlatforms.includes('youtube')
  const isGoogleBusinessSelected = config.targetPlatforms.includes('googlebusiness')

  return (
    <div className="repurpose-wizard flex-1 flex flex-col min-h-screen bg-[var(--bg)] text-[var(--text)] overflow-y-auto">
      {/* SCOPED WIZARD STYLE INJECTION */}
      <style dangerouslySetInnerHTML={{ __html: `
        .repurpose-wizard {
          --bg: var(--clr-canvas);
          --bg-card: #ffffff;
          --bg-elevated: var(--clr-canvas-soft);
          --border: var(--clr-border);
          --border-strong: var(--clr-mute);
          --text: var(--clr-ink);
          --text-muted: var(--clr-body);
          --text-dim: var(--clr-body-mid);
          --primary: var(--clr-primary);
          --primary-hover: #9333ea;
          --pink: #ec4899;
          --cyan: #06b6d4;
          
          background-image:
            radial-gradient(circle at 15% 10%, rgba(168, 85, 247, 0.04), transparent 40%),
            radial-gradient(circle at 85% 80%, rgba(236, 72, 153, 0.03), transparent 40%),
            radial-gradient(circle at 50% 50%, rgba(6, 182, 212, 0.02), transparent 60%);
          background-attachment: fixed;
        }
        .repurpose-wizard .step-dot {
          width: 32px; height: 32px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 13px; font-weight: 700;
          border: 1.5px solid var(--border-strong);
          background: var(--bg-card);
          color: var(--text-muted);
          transition: all 0.3s;
        }
        .repurpose-wizard .step-dot.active {
          background: linear-gradient(135deg, #a855f7, #ec4899);
          border-color: transparent;
          color: white;
          box-shadow: 0 0 20px rgba(168, 85, 247, 0.4);
        }
        .repurpose-wizard .step-dot.done {
          background: rgba(168, 85, 247, 0.15);
          border-color: var(--primary);
          color: var(--primary);
        }
        .repurpose-wizard .step-line { flex: 1; height: 2px; background: var(--border); position: relative; overflow: hidden; }
        .repurpose-wizard .step-line.done { background: var(--primary); }

        .repurpose-wizard .card {
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 16px;
          backdrop-filter: blur(12px);
        }

        .repurpose-wizard .chip {
          padding: 8px 14px;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 600;
          border: 1px solid var(--border-strong);
          background: transparent;
          color: var(--text-muted);
          cursor: pointer;
          transition: all 0.2s;
          white-space: nowrap;
        }
        .repurpose-wizard .chip:hover { color: var(--text); border-color: var(--text-dim); }
        .repurpose-wizard .chip.active {
          background: linear-gradient(135deg, #a855f7, #ec4899);
          border-color: transparent;
          color: white;
        }

        .repurpose-wizard .btn-primary {
          background: linear-gradient(135deg, #a855f7, #ec4899);
          color: white;
          border: none;
          padding: 14px 24px;
          border-radius: 12px;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          display: inline-flex; align-items: center; gap: 10px;
          transition: all 0.2s;
          box-shadow: 0 4px 20px rgba(168, 85, 247, 0.3);
        }
        .repurpose-wizard .btn-primary:hover { transform: translateY(-1px); box-shadow: 0 6px 24px rgba(168, 85, 247, 0.4); }
        .repurpose-wizard .btn-primary:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }
        
        .repurpose-wizard .btn-secondary {
          background: var(--bg-card);
          color: var(--text);
          border: 1px solid var(--border-strong);
          padding: 14px 24px;
          border-radius: 12px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          display: inline-flex; align-items: center; gap: 10px;
          transition: all 0.2s;
        }
        .repurpose-wizard .btn-secondary:hover { border-color: var(--text-dim); }
        
        .repurpose-wizard .btn-ghost {
          background: transparent;
          color: var(--text-muted);
          border: 1px solid var(--border);
          padding: 8px 14px;
          border-radius: 10px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          display: inline-flex; align-items: center; gap: 6px;
          transition: all 0.2s;
        }
        .repurpose-wizard .btn-ghost:hover { color: var(--text); border-color: var(--text-dim); }

        .repurpose-wizard .mode-tab {
          display: flex; align-items: center; gap: 6px;
          padding: 10px 14px;
          font-size: 13px;
          font-weight: 500;
          color: var(--text-muted);
          background: transparent;
          border: none;
          border-bottom: 2px solid transparent;
          cursor: pointer;
          transition: all 0.2s;
        }
        .repurpose-wizard .mode-tab:hover { color: var(--text); }
        .repurpose-wizard .mode-tab.active { color: var(--primary); border-bottom-color: var(--primary); }

        .repurpose-wizard .drawer-overlay {
          position: fixed; inset: 0;
          background: rgba(0,0,0,0.5);
          backdrop-filter: blur(4px);
          z-index: 40;
          opacity: 0; pointer-events: none;
          transition: opacity 0.3s;
        }
        .repurpose-wizard .drawer-overlay.open { opacity: 1; pointer-events: auto; }
        .repurpose-wizard .drawer {
          position: fixed; top: 0; right: 0; bottom: 0;
          width: 420px; max-width: 100vw;
          background: var(--bg-card);
          border-left: 1px solid var(--border);
          z-index: 50;
          transform: translateX(100%);
          transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1);
          display: flex; flex-direction: column;
          box-shadow: -8px 0 32px rgba(0, 0, 0, 0.08);
        }
        .repurpose-wizard .drawer.open { transform: translateX(0); }

        .repurpose-wizard .input-area {
          width: 100%;
          background: transparent;
          border: none;
          color: var(--text);
          font-size: 14px;
          line-height: 1.7;
          resize: none;
          outline: none;
          font-family: inherit;
        }
        .repurpose-wizard .input-area::placeholder {
          color: var(--text-dim);
        }

        .repurpose-wizard .toggle {
          width: 36px; height: 20px;
          background: var(--bg-elevated);
          border: 1px solid var(--border-strong);
          border-radius: 999px;
          position: relative;
          cursor: pointer;
          transition: all 0.2s;
          flex-shrink: 0;
        }
        .repurpose-wizard .toggle::after {
          content: '';
          position: absolute;
          top: 2px; left: 2px;
          width: 14px; height: 14px;
          background: var(--text-muted);
          border-radius: 50%;
          transition: all 0.2s;
        }
        .repurpose-wizard .toggle.on { background: rgba(168, 85, 247, 0.2); border-color: var(--primary); }
        .repurpose-wizard .toggle.on::after { transform: translateX(16px); background: var(--primary); }

        .repurpose-wizard .status-badge {
          display: inline-flex; align-items: center; gap: 4px;
          padding: 3px 10px;
          border-radius: 999px;
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .repurpose-wizard .status-draft { background: rgba(139, 92, 246, 0.15); color: var(--primary); }
        .repurpose-wizard .status-scheduled { background: rgba(6, 182, 212, 0.15); color: var(--cyan); }
        .repurpose-wizard .status-published { background: rgba(34, 197, 94, 0.15); color: #22c55e; }



        .repurpose-wizard .toast {
          position: fixed;
          bottom: 24px; left: 50%;
          transform: translateX(-50%) translateY(100px);
          background: var(--bg-elevated);
          border: 1px solid var(--primary);
          color: var(--text);
          padding: 12px 20px;
          border-radius: 12px;
          font-size: 13px; font-weight: 600;
          display: flex; align-items: center; gap: 8px;
          z-index: 200;
          transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          box-shadow: 0 8px 32px rgba(168, 85, 247, 0.3);
        }
        .repurpose-wizard .toast.show { transform: translateX(-50%) translateY(0); }

        .repurpose-wizard .compose-btn {
          display: flex; align-items: center; justify-content: center; gap: 8px;
          width: 100%;
          padding: 10px 14px;
          border-radius: 10px;
          background: linear-gradient(135deg, rgba(168, 85, 247, 0.15), rgba(236, 72, 153, 0.15));
          border: 1px solid rgba(168, 85, 247, 0.3);
          color: var(--text);
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
        }
        .repurpose-wizard .compose-btn:hover {
          background: linear-gradient(135deg, rgba(168, 85, 247, 0.25), rgba(236, 72, 153, 0.25));
          border-color: var(--primary);
          transform: translateY(-1px);
        }

        .repurpose-wizard .step-panel {
          animation: repurposeSlideIn 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }
        @keyframes repurposeSlideIn {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
      ` }} />

      {/* HEADER */}
      <header className="border-b border-[var(--border)] px-6 lg:px-10 py-5 bg-[var(--bg-elevated)]/85 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-gradient-to-br from-[#a855f7] to-[#ec4899]">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-title text-xl font-bold leading-none text-[var(--text)]">Repurpose</h1>
              <p className="text-[11px] text-[var(--text-muted)] mt-1">Biến nội dung dài thành bài đăng đa nền tảng</p>
            </div>
          </div>

          {/* STEP NAVIGATION */}
          <nav className="flex items-center gap-3 w-full sm:w-auto max-w-md" id="stepper">
            <button className="flex items-center gap-2 step-item" onClick={() => goToStep(1)}>
              <div className={cn("step-dot", currentStep === 1 && "active", currentStep > 1 && "done")}>1</div>
              <span className={cn("text-xs font-semibold hidden sm:inline step-label", currentStep === 1 ? "text-[var(--primary)]" : "text-[var(--text-muted)]")}>Nội dung</span>
            </button>
            <div className={cn("step-line", currentStep > 1 && "done")} />
            <button className="flex items-center gap-2 step-item" onClick={() => maxStepReached >= 2 && goToStep(2)}>
              <div className={cn("step-dot", currentStep === 2 && "active", currentStep > 2 && "done")}>2</div>
              <span className={cn("text-xs font-semibold hidden sm:inline step-label", currentStep === 2 ? "text-[var(--primary)]" : "text-[var(--text-muted)]")}>Cấu hình</span>
            </button>
            <div className={cn("step-line", currentStep > 2 && "done")} />
            <button className="flex items-center gap-2 step-item" onClick={() => maxStepReached >= 3 && goToStep(3)}>
              <div className={cn("step-dot", currentStep === 3 && "active")}>3</div>
              <span className={cn("text-xs font-semibold hidden sm:inline step-label", currentStep === 3 ? "text-[var(--primary)]" : "text-[var(--text-muted)]")}>Kết quả</span>
            </button>
          </nav>

          <div className="flex items-center gap-2">
            <button className="btn-ghost" onClick={() => setIsPostsOpen(true)}>
              <Send size={14} className="mr-1.5" />
              Bài đăng
              <span className="bg-[var(--primary)] text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold ml-1.5">
                {workspacePosts.length}
              </span>
            </button>
            <button className="btn-ghost" onClick={() => setIsHistoryOpen(true)}>
              <History size={14} className="mr-1.5" />
              <span className="hidden sm:inline">Lịch sử</span>
            </button>
          </div>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="flex-1 px-6 lg:px-10 py-8 max-w-7xl mx-auto w-full flex flex-col">
        
        {/* ============ STEP 1: NỘI DUNG ============ */}
        {currentStep === 1 && (
          <section id="step-1" className="step-panel max-w-3xl mx-auto w-full text-center">
            <div className="mb-8">
              <h2 className="font-title text-3xl font-bold mb-2 text-[var(--text)]">Bắt đầu với nội dung của bạn</h2>
              <p className="text-[var(--text-muted)] text-sm">Dán bài viết, kịch bản, email hoặc bất kỳ nội dung nào</p>
            </div>

            <div className="card overflow-hidden">
              {/* Tab navigation */}
              <div className="flex items-center gap-1 px-2 border-b border-[var(--border)] overflow-x-auto bg-[var(--bg-elevated)]/40">
                <button 
                  onClick={() => setInputMode('paste')} 
                  className={cn("mode-tab", inputMode === 'paste' && "active")}
                >
                  <FileText className="w-4 h-4 mr-1.5" /> Paste văn bản
                </button>
                <button 
                  onClick={() => setInputMode('url')} 
                  className={cn("mode-tab", inputMode === 'url' && "active")}
                >
                  <Link2 className="w-4 h-4 mr-1.5" /> Từ URL
                </button>
                <button 
                  onClick={() => setInputMode('upload')} 
                  className={cn("mode-tab", inputMode === 'upload' && "active")}
                >
                  <UploadCloud className="w-4 h-4 mr-1.5" /> Tải file
                </button>
                <button 
                  onClick={() => setInputMode('post')} 
                  className={cn("mode-tab", inputMode === 'post' && "active")}
                >
                  <History className="w-4 h-4 mr-1.5" /> Chọn từ bài đăng
                </button>
              </div>

              {/* Input panels */}
              <div className="p-6">
                {inputMode === 'paste' && (
                  <textarea 
                    value={config.sourceText} 
                    onChange={(e) => setConfig(prev => ({ ...prev, sourceText: e.target.value }))}
                    className="input-area min-h-[280px]" 
                    placeholder="Dán nội dung của bạn vào đây...&#10;&#10;Ví dụ: một bài blog, kịch bản video, email newsletter, bài thuyết trình..."
                  />
                )}

                {inputMode === 'url' && (
                  <div className="flex flex-col gap-3 py-4 text-left">
                    <label className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">URL bài viết</label>
                    <div className="flex gap-2">
                      <input 
                        type="url" 
                        value={urlInput}
                        onChange={(e) => setUrlInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && !isFetchingUrl && handleFetchUrl()}
                        placeholder="https://example.com/blog/my-article" 
                        className="flex-1 bg-[var(--bg-elevated)] border border-[var(--border-strong)] rounded-lg px-4 py-3 text-sm text-[var(--text)] outline-none focus:border-[var(--primary)] transition-colors" 
                      />
                      <button 
                        onClick={handleFetchUrl} 
                        disabled={isFetchingUrl || !urlInput.trim()}
                        className="btn-primary" 
                        style={{ padding: '0 20px', borderRadius: '8px' }}
                      >
                        {isFetchingUrl ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Trích xuất'}
                      </button>
                    </div>
                    <p className="text-xs text-[var(--text-dim)]">Hỗ trợ blog, Medium, Substack, WordPress...</p>
                  </div>
                )}

                {inputMode === 'upload' && (
                  <div className="py-4">
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      onChange={(e) => {
                        if (e.target.files) handleFiles(e.target.files)
                        e.target.value = ''
                      }}
                      className="hidden" 
                      accept=".txt,.md,.pdf,.docx"
                    />
                    <div
                      onDragOver={(e) => { e.preventDefault(); setIsDraggingFile(true); }}
                      onDragLeave={() => setIsDraggingFile(false)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setIsDraggingFile(false);
                        if (e.dataTransfer.files.length > 0) handleFiles(e.dataTransfer.files)
                      }}
                      onClick={() => fileInputRef.current?.click()}
                      className={cn(
                        "border-2 border-dashed rounded-xl p-10 text-center transition-all duration-200 cursor-pointer",
                        isDraggingFile ? "border-[var(--primary)] bg-[var(--primary)]/5" : "border-[var(--border-strong)] hover:border-[var(--primary)]"
                      )}
                    >
                      <UploadCloud className="w-10 h-10 mx-auto text-[var(--text-muted)] mb-3" />
                      <p className="text-sm font-semibold mb-1 text-[var(--text)]">Kéo thả file vào đây</p>
                      <p className="text-xs text-[var(--text-muted)]">hoặc click để chọn file · PDF, DOCX, TXT, MD · Tối đa 5MB</p>
                    </div>
                  </div>
                )}

                {inputMode === 'post' && (
                  <div className="flex flex-col gap-4 py-2">
                    <div className="relative">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                      <input 
                        type="text" 
                        placeholder="Tìm bài đăng cũ..." 
                        value={postsSearchQuery}
                        onChange={(e) => setPostsSearchQuery(e.target.value)}
                        className="w-full bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg pl-9 pr-4 py-2 text-sm text-[var(--text)] outline-none focus:border-[var(--primary)] transition-colors"
                      />
                    </div>
                    
                    <div className="max-h-[240px] overflow-y-auto flex flex-col gap-2 pr-1">
                      {isLoadingPosts ? (
                        <div className="flex items-center justify-center py-6 text-sm text-[var(--text-muted)]">
                          <Loader2 size={16} className="animate-spin mr-2" /> Đang tải bài đăng...
                        </div>
                      ) : filteredWorkspacePosts.length === 0 ? (
                        <div className="text-center py-6 text-xs text-[var(--text-muted)]">
                          Không tìm thấy bài đăng nào
                        </div>
                      ) : (
                        filteredWorkspacePosts.map(post => {
                          const isSelected = config.sources.some(s => s.type === 'post' && s.postId === post.id)
                          return (
                            <div 
                              key={post.id} 
                              onClick={() => handleTogglePost(post)}
                              className={cn(
                                "flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors text-left",
                                isSelected ? "border-[var(--primary)] bg-primary/[0.04]" : "border-[var(--border)] bg-[var(--bg-elevated)]/20 hover:border-[var(--border-strong)]"
                              )}
                            >
                              <div className="flex flex-col gap-0.5">
                                <span className="text-xs font-bold text-[var(--text)] line-clamp-1">{post.title || post.content?.slice(0, 30) || 'Untitled Post'}</span>
                                <span className="text-[10px] text-[var(--text-muted)]">{post.status} · {new Date(post.createdAt).toLocaleDateString()}</span>
                              </div>
                              <span className={cn(
                                "text-[10px] px-2 py-0.5 rounded-full font-bold",
                                isSelected ? "bg-[var(--primary)] text-white" : "bg-[var(--bg-elevated)] text-[var(--text-muted)]"
                              )}>
                                {isSelected ? 'Đã chọn' : 'Chọn'}
                              </span>
                            </div>
                          )
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Source chips bar if sources exist */}
              {allSources.length > 0 && (
                <div className="flex flex-wrap gap-1.5 px-6 py-3 border-t border-[var(--border)] bg-[var(--bg-elevated)]/20">
                  {allSources.map(source => (
                    <SourceChip key={source.id} source={source} onRemove={removeSource} />
                  ))}
                </div>
              )}

              {/* Step Footer stats */}
              <div className="px-6 py-4 border-t border-[var(--border)] flex items-center justify-between gap-4 flex-wrap bg-[var(--bg-elevated)]/40">
                <div className="flex items-center gap-4 text-xs text-[var(--text-muted)] flex-wrap">
                  <span className="flex items-center gap-1">
                    <Type className="w-3.5 h-3.5" />
                    <strong className="text-[var(--text)]">{combinedChars.toLocaleString()}</strong> ký tự
                  </span>
                  <span className="flex items-center gap-1">
                    <Text className="w-3.5 h-3.5" />
                    <strong className="text-[var(--text)]">{wordCount.toLocaleString()}</strong> từ
                  </span>
                  {estPosts > 0 && (
                    <span id="stat-estimate" className="flex items-center gap-1.5 text-purple-400 font-semibold transition-opacity">
                      <Sparkles className="w-3.5 h-3.5 text-[var(--primary)] animate-pulse" />
                      ~<strong>{estPosts}</strong> bài đăng
                    </span>
                  )}

                </div>
                
                <button 
                  id="btn-next-1" 
                  onClick={() => goToStep(2)}
                  disabled={!hasInputContent}
                  className="btn-primary"
                >
                  Tiếp tục <ArrowRight className="w-4 h-4 ml-1.5" />
                </button>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="card p-4 flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center flex-shrink-0">
                  <Zap className="w-4 h-4 text-purple-400" />
                </div>
                <div>
                  <p className="text-xs font-bold mb-0.5 text-[var(--text)]">Nhanh chóng</p>
                  <p className="text-[11px] text-[var(--text-muted)]">Tạo bài đăng trong vài giây với Gemini AI</p>
                </div>
              </div>
              <div className="card p-4 flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-pink-500/10 flex items-center justify-center flex-shrink-0">
                  <Layers className="w-4 h-4 text-pink-400" />
                </div>
                <div>
                  <p className="text-xs font-bold mb-0.5 text-[var(--text)]">Tối ưu từng kênh</p>
                  <p className="text-[11px] text-[var(--text-muted)]">Tự động điều chỉnh giọng điệu mỗi mạng xã hội</p>
                </div>
              </div>
              <div className="card p-4 flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-4 h-4 text-cyan-400" />
                </div>
                <div>
                  <p className="text-xs font-bold mb-0.5 text-[var(--text)]">Đa phương tiện</p>
                  <p className="text-[11px] text-[var(--text-muted)]">Hỗ trợ tự động tạo hình ảnh và video ngắn</p>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ============ STEP 2: CẤU HÌNH ============ */}
        {currentStep === 2 && (
          <section id="step-2" className="step-panel w-full text-center">
            <div className="mb-8">
              <h2 className="font-title text-3xl font-bold mb-2 text-[var(--text)]">Tinh chỉnh cấu hình</h2>
              <p className="text-[var(--text-muted)] text-sm">Chọn giọng điệu, nền tảng đích và tùy chọn bổ sung từ AI</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              {/* Left Settings Panel */}
              <div className="lg:col-span-2 flex flex-col gap-5">
                <div className="card p-6">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)] mb-5 flex items-center gap-2">
                    <Settings2 className="w-3.5 h-3.5 text-[var(--primary)]" /> Cài đặt AI
                  </h3>
                  
                  {/* Tones Selection */}
                  <div className="mb-5 text-left">
                    <label className="text-xs font-semibold text-[var(--text)] mb-2.5 block">Giọng điệu</label>
                    <div className="flex flex-wrap gap-2" id="tone-group">
                      {[
                        { id: 'default', label: '🎯 Adaptive' },
                        { id: 'professional', label: '💼 Chuyên nghiệp' },
                        { id: 'casual', label: '😊 Thân thiện' },
                        { id: 'bold', label: '🔥 Mạnh mẽ' },
                        { id: 'educational', label: '📚 Giáo dục' }
                      ].map(t => (
                        <button 
                          key={t.id} 
                          onClick={() => setConfig(prev => ({ ...prev, tone: t.id }))}
                          className={cn("chip", config.tone === t.id && "active")}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Length Selection */}
                  <div className="mb-5 text-left">
                    <label className="text-xs font-semibold text-[var(--text)] mb-2.5 block">Độ dài</label>
                    <div className="flex gap-2" id="length-group">
                      {[
                        { id: 'short', label: 'Ngắn' },
                        { id: 'medium', label: 'Vừa' },
                        { id: 'long', label: 'Dài' }
                      ].map(l => (
                        <button 
                          key={l.id} 
                          onClick={() => setConfig(prev => ({ ...prev, contentLength: l.id }))}
                          className={cn("chip", config.contentLength === l.id && "active")}
                        >
                          {l.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Language Selection */}
                  <div className="text-left">
                    <label className="text-xs font-semibold text-[var(--text)] mb-2.5 block">Ngôn ngữ</label>
                    <div className="flex gap-2" id="lang-group">
                      {[
                        { id: 'vi', label: '🇻🇳 Tiếng Việt' },
                        { id: 'en', label: '🇬🇧 English' }
                      ].map(g => (
                        <button 
                          key={g.id} 
                          onClick={() => setConfig(prev => ({ ...prev, language: g.id }))}
                          className={cn("chip", config.language === g.id && "active")}
                        >
                          {g.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Advanced Toggles Accordion */}
                <div className="card overflow-hidden">
                  <button 
                    className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-[var(--bg-elevated)]/50 transition-colors text-[var(--text)]" 
                    onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
                  >
                    <span className="flex items-center gap-2 text-sm font-semibold">
                      <Settings2 className="w-4 h-4 text-[var(--primary)]" />
                      Tùy chọn nâng cao
                    </span>
                    <ChevronDown className={cn("w-4 h-4 text-[var(--text-muted)] transition-transform", isAdvancedOpen && "rotate-180")} />
                  </button>
                  
                  {isAdvancedOpen && (
                    <div className="px-6 pb-5 flex flex-col gap-4 text-left">
                      <label className="flex items-start gap-3 cursor-pointer">
                        <button 
                          onClick={() => setConfig(prev => ({ ...prev, extractAtoms: !prev.extractAtoms }))}
                          className={cn("toggle", config.extractAtoms && "on")} 
                        />
                        <div>
                          <p className="text-sm font-semibold flex items-center gap-1.5 text-[var(--text)]">
                            <Lightbulb className="w-3.5 h-3.5 text-yellow-400" /> Trích xuất insights
                          </p>
                          <p className="text-[11px] text-[var(--text-muted)] mt-0.5">Trích điểm chính, trích dẫn, lời khuyên cốt lõi</p>
                        </div>
                      </label>
                      
                      <label className="flex items-start gap-3 cursor-pointer">
                        <button 
                          onClick={() => {
                            setConfig(prev => {
                              const nextGenerateMedia = !prev.generateMedia
                              let nextMediaType = prev.mediaType
                              if (nextGenerateMedia && !nextMediaType) {
                                const hasYouTube = prev.targetPlatforms.includes('youtube')
                                nextMediaType = hasYouTube ? 'video' : 'image'
                              }
                              
                              let nextPlatforms = prev.targetPlatforms
                              if (nextGenerateMedia && prev.targetPlatforms.length > 1) {
                                nextPlatforms = [prev.targetPlatforms[0]]
                              }
                              
                              return {
                                ...prev,
                                generateMedia: nextGenerateMedia,
                                mediaType: nextMediaType,
                                targetPlatforms: nextPlatforms
                              }
                            })
                          }}
                          className={cn("toggle", config.generateMedia && "on")} 
                        />
                        <div>
                          <p className="text-sm font-semibold flex items-center gap-1.5 text-[var(--text)]">
                            <ImageIcon className="w-3.5 h-3.5 text-pink-400" /> Tạo media tự động
                          </p>
                          <p className="text-[11px] text-[var(--text-muted)] mt-0.5">Tạo ảnh/video ngắn tương thích với nền tảng đích</p>
                        </div>
                      </label>

                      {config.generateMedia && (
                        <div className="ml-12 p-3 rounded-lg bg-[var(--bg-elevated)] flex gap-2 border border-[var(--border)]">
                          <button 
                            disabled={isYouTubeSelected}
                            onClick={() => setConfig(prev => ({ ...prev, mediaType: 'image' }))}
                            className={cn(
                              "flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg border text-xs font-semibold transition-all",
                              config.mediaType === 'image'
                                ? "bg-primary/10 text-primary border-primary"
                                : "bg-[var(--bg-card)] text-[var(--text-muted)] border-[var(--border)] hover:border-[var(--border-strong)] hover:text-[var(--text)]",
                              isYouTubeSelected && "opacity-40 cursor-not-allowed"
                            )}
                            title={isYouTubeSelected ? "YouTube không hỗ trợ định dạng hình ảnh" : "Tạo ảnh với gemini-3.1-flash-image"}
                          >
                            <ImageIcon size={14} />
                            <span>Tạo Ảnh</span>
                          </button>
                          
                          <button 
                            disabled={isGoogleBusinessSelected}
                            onClick={() => setConfig(prev => ({ ...prev, mediaType: 'video' }))}
                            className={cn(
                              "flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg border text-xs font-semibold transition-all",
                              config.mediaType === 'video'
                                ? "bg-primary/10 text-primary border-primary"
                                : "bg-[var(--bg-card)] text-[var(--text-muted)] border-[var(--border)] hover:border-[var(--border-strong)] hover:text-[var(--text)]",
                              isGoogleBusinessSelected && "opacity-40 cursor-not-allowed"
                            )}
                            title={isGoogleBusinessSelected ? "Google Business không hỗ trợ định dạng video" : "Tạo video với veo-3.1-lite-generate-preview"}
                          >
                            <VideoIcon size={14} />
                            <span>Tạo Video</span>
                          </button>
                        </div>
                      )}

                      <label className="flex items-start gap-3 cursor-pointer">
                        <button className="toggle on" />
                        <div>
                          <p className="text-sm font-semibold flex items-center gap-1.5 text-[var(--text)]">
                            <Hash className="w-3.5 h-3.5 text-cyan-400" /> Tự động thêm hashtags
                          </p>
                          <p className="text-[11px] text-[var(--text-muted)] mt-0.5">Phân tích xu hướng để sinh hashtags phù hợp</p>
                        </div>
                      </label>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Platforms Selector Panel */}
              <div className="lg:col-span-3">
                <div className="card p-6 h-full flex flex-col">
                  <div className="flex items-center justify-between mb-5">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)] flex items-center gap-2">
                      <Layers className="w-3.5 h-3.5 text-[var(--primary)]" /> Nền tảng đích
                    </h3>
                    <span className="text-xs font-bold text-[var(--primary)]">
                      {config.targetPlatforms.length} đã chọn
                    </span>
                  </div>
                  
                  {/* Search Bar */}
                  <div className="relative mb-4">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                    <input 
                      type="text" 
                      value={platformSearch}
                      onChange={(e) => setPlatformSearch(e.target.value)}
                      placeholder="Tìm nền tảng..." 
                      className="w-full bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg pl-9 pr-4 py-2.5 text-sm text-[var(--text)] outline-none focus:border-[var(--primary)] transition-colors" 
                    />
                  </div>
                  
                  {/* Platforms Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 overflow-y-auto flex-1 pr-1" style={{ maxHeight: '420px' }}>
                    {filteredPlatforms.map(p => {
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
                              : "bg-[var(--bg-card)] text-[var(--text-muted)] border-[var(--border)] hover:border-[var(--border-strong)] hover:text-[var(--text)]"
                          )}
                        >
                          <span className="platform-icon shrink-0 w-4 h-4 flex items-center justify-center">
                            <ExtendedPlatformIcon platform={p.id} size={14} />
                          </span>
                          <span className="flex-1 line-clamp-1">{p.label}</span>
                          {isActive && (
                            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="shrink-0">
                              <path d="M3 6l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          )}
                        </button>
                      )
                    })}
                  </div>

                  <div className="mt-5 pt-5 border-t border-[var(--border)] flex items-center justify-between gap-3 flex-wrap">
                    <button className="btn-secondary" onClick={() => goToStep(1)}>
                      <ArrowLeft className="w-4 h-4 mr-1.5" /> Quay lại
                    </button>
                    <button 
                      onClick={handleGenerate}
                      disabled={config.targetPlatforms.length === 0}
                      className="btn-primary"
                    >
                      <Sparkles className="w-4 h-4 mr-1.5" />
                      <span>Bắt đầu tạo nội dung</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ============ STEP 3: KẾT QUẢ ============ */}
        {currentStep === 3 && (
          <section id="step-3" className="step-panel w-full text-left">
            <div className="mb-6 flex items-center justify-between gap-4 flex-wrap">
              <div>
                <h2 className="font-title text-3xl font-bold mb-1 text-[var(--text)]">Kết quả đã sẵn sàng ✨</h2>
                <p className="text-[var(--text-muted)] text-sm">
                  Đã tạo <strong className="text-[var(--text)]">{results.length}</strong> bài đăng · Click <strong className="text-[var(--primary)]">"Create Post"</strong> trên card để tinh chỉnh & đăng bài
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button className="btn-ghost" onClick={() => goToStep(2)}>
                  <Settings size={14} className="mr-1.5" /> Chỉnh sửa cài đặt
                </button>
                {results.length > 0 && (
                  <button className="btn-ghost" onClick={handleClearCurrentResults}>
                    <Trash2 size={14} className="mr-1.5" /> Xóa kết quả
                  </button>
                )}
                <button className="btn-primary" onClick={handleStartNewRepurpose}>
                  <Plus className="w-4 h-4 mr-1.5" /> Tạo mới
                </button>
              </div>
            </div>

            <div className="mt-4">
              <ResultsBentoGrid onCreatePostToolbar={handleCreatePost} />
            </div>
          </section>
        )}

      </main>

      {/* HISTORY DRAWER PANEL */}
      <div className={cn("drawer-overlay", isHistoryOpen && "open")} onClick={() => setIsHistoryOpen(false)} />
      <aside className={cn("drawer", isHistoryOpen && "open")}>
        <div className="px-6 py-5 border-b border-[var(--border)] flex items-center justify-between">
          <div>
            <h3 className="font-title text-lg font-bold text-[var(--text)]">Lịch sử Repurpose</h3>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">Các phiên đã tạo nội dung</p>
          </div>
          <button onClick={() => setIsHistoryOpen(false)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-[var(--bg-elevated)] text-[var(--text)] transition-colors">
            <X size={16} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
          {sessions.length === 0 ? (
            <div className="text-center py-12 text-sm text-[var(--text-muted)]">
              Không có lịch sử phiên làm việc nào.
            </div>
          ) : (
            sessions.map(s => {
              const isCurrent = activeSessionId === s.id
              return (
                <div 
                  key={s.id} 
                  onClick={async () => {
                    await switchSession(s.id)
                    setIsHistoryOpen(false)
                    goToStep(3)
                    showToast('Đã tải phiên làm việc lịch sử!')
                  }}
                  className={cn(
                    "card p-4 hover:border-[var(--border-strong)] transition-colors cursor-pointer text-left relative",
                    isCurrent && "border-[var(--primary)] bg-primary/[0.03]"
                  )}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <p className="text-sm font-semibold line-clamp-1 text-[var(--text)]">
                      {s.sourceText?.split('\n')[0]?.slice(0, 30) || 'Đang tạo hoặc trống...'}
                    </p>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation()
                        setDeleteTargetId(s.id)
                      }}
                      className="text-[var(--text-muted)] hover:text-destructive p-1 rounded hover:bg-[var(--bg-elevated)] transition-colors"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-[var(--text-muted)] mb-3">
                    <span className="flex items-center gap-1">
                      <Calendar size={11} /> {new Date(s.createdAtUtc).toLocaleDateString()}
                    </span>
                    <span>·</span>
                    <span>Giọng: {s.tone}</span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {s.targetPlatforms.split(',').map(plat => (
                      <span key={plat} className="text-[10px] px-2 py-0.5 rounded bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--text-muted)] font-semibold uppercase">
                        {plat}
                      </span>
                    ))}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </aside>

      {/* POSTS DRAWER PANEL */}
      <div className={cn("drawer-overlay", isPostsOpen && "open")} onClick={() => setIsPostsOpen(false)} />
      <aside className={cn("drawer", isPostsOpen && "open")}>
        <div className="px-6 py-5 border-b border-[var(--border)] flex items-center justify-between">
          <div>
            <h3 className="font-title text-lg font-bold text-[var(--text)]">Bài đăng của tôi</h3>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">{workspacePosts.length} bài đăng</p>
          </div>
          <button onClick={() => setIsPostsOpen(false)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-[var(--bg-elevated)] text-[var(--text)] transition-colors">
            <X size={16} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
          {workspacePosts.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center py-16 px-6">
              <div className="w-14 h-14 rounded-2xl bg-[var(--bg-elevated)] flex items-center justify-center mb-4 text-[var(--text)]">
                <Send size={24} className="text-[var(--text-muted)]" />
              </div>
              <p className="text-sm font-semibold mb-1 text-[var(--text)]">Chưa có bài đăng nào</p>
              <p className="text-xs text-[var(--text-muted)] max-w-[240px]">
                Tạo nội dung ở bước 3, sau đó click "Tạo bài đăng" để bắt đầu
              </p>
            </div>
          ) : (
            workspacePosts.map(post => (
              <div key={post.id} className="card p-4 hover:border-[var(--border-strong)] transition-colors cursor-pointer text-left">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <p className="text-sm font-semibold line-clamp-1 text-[var(--text)]">{post.title || post.content?.slice(0, 40) || 'Bài đăng không tên'}</p>
                  <span className={cn(
                    "status-badge text-[9px] px-2 py-0.5",
                    post.status === 'draft' && "status-draft",
                    post.status === 'scheduled' && "status-scheduled",
                    (post.status === 'published' || post.status === 'publishing') && "status-published",
                    (post.status === 'failed' || post.status === 'partial') && "bg-destructive/15 text-destructive"
                  )}>
                    {post.status}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-[var(--text-muted)] mb-3">
                  <span className="flex items-center gap-1">
                    <Calendar size={11} /> 
                    {post.scheduledAtUtc ? new Date(post.scheduledAtUtc).toLocaleDateString() : new Date(post.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {post.platforms?.map(plat => {
                    const pStyle = getPlatformStyle(plat)
                    return (
                      <span 
                        key={plat} 
                        style={{ color: pStyle.color, borderColor: pStyle.border, background: pStyle.bg }}
                        className="text-[10px] px-2 py-0.5 rounded border font-semibold uppercase"
                      >
                        {plat}
                      </span>
                    )
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </aside>

      {/* SYSTEM FEEDBACK NOTIFICATIONS */}
      {error && (
        <div className="flex items-center gap-2.5 px-4 py-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm animate-in slide-in-from-top-2 duration-200 fixed bottom-6 right-6 z-50 shadow-lg backdrop-blur-md">
          <AlertTriangle size={14} />
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-auto bg-none border-none text-destructive cursor-pointer p-0.5 opacity-70 hover:opacity-100 transition-opacity">
            <X size={12} />
          </button>
        </div>
      )}

      {/* TOAST PANEL */}
      <div className={cn("toast", toastMsg && "show")}>
        <CheckCircle2 className="w-4 h-4 text-green-400" />
        <span id="toast-msg">{toastMsg}</span>
      </div>

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
