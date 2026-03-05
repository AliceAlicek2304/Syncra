import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { Sparkles, X, TrendingUp, ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react'
import styles from './AICoach.module.css'
import { TREND_TIPS } from '../data/mockCoachTrends'
import AIIdeaGenerator from './AIIdeaGenerator'
import { useCreatePostModal } from '../context/createPostModalContext'
import type { ContentIdea } from '../data/mockAI'

export default function AICoach() {
  const [isOpen, setIsOpen] = useState(false)
  const [showNotification, setShowNotification] = useState(false)
  const [generatorIdeas, setGeneratorIdeas] = useState<ContentIdea[] | null>(null)
  
  const { openCreatePost } = useCreatePostModal()
  
  // Carousel state
  const [slideIndex, setSlideIndex] = useState(1)
  const [enableTransition, setEnableTransition] = useState(true)
  const [isAnimating, setIsAnimating] = useState(false)
  const isAnimatingRef = useRef(false)

  useEffect(() => {
    isAnimatingRef.current = isAnimating
  }, [isAnimating])

  // Add cloned slides at boundaries for infinite loop
  const slides = useMemo(() => {
    if (!TREND_TIPS || TREND_TIPS.length === 0) return []
    return [TREND_TIPS[TREND_TIPS.length - 1], ...TREND_TIPS, TREND_TIPS[0]]
  }, [])

  useEffect(() => {
    // Simulate a notification popping up after 3 seconds
    const timer = setTimeout(() => {
      if (!isOpen) setShowNotification(true)
    }, 3000)
    return () => clearTimeout(timer)
  }, [isOpen])

  const toggleCoach = () => {
    setIsOpen(!isOpen)
    setShowNotification(false)
  }

  const handleActionClick = (ideas: ContentIdea[]) => {
    setGeneratorIdeas(ideas)
    setIsOpen(false) // Close coach panel, then open generator modal
  }

  const handleNext = useCallback(() => {
    if (isAnimatingRef.current || slides.length === 0) return
    setIsAnimating(true)
    setEnableTransition(true)
    setSlideIndex(i => i + 1)
  }, [slides.length])

  const handlePrev = useCallback(() => {
    if (isAnimatingRef.current || slides.length === 0) return
    setIsAnimating(true)
    setEnableTransition(true)
    setSlideIndex(i => i - 1)
  }, [slides.length])

  const handleTransitionEnd = () => {
    setIsAnimating(false)
    if (slideIndex === slides.length - 1) {
      // Reached the clone of first, snap to real first
      setEnableTransition(false)
      setSlideIndex(1)
    } else if (slideIndex === 0) {
      // Reached the clone of last, snap to real last
      setEnableTransition(false)
      setSlideIndex(slides.length - 2)
    }
  }

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (e.key === 'ArrowLeft') handlePrev()
      if (e.key === 'ArrowRight') handleNext()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, handlePrev, handleNext])

  // Calculate index for the pagination display
  const realIndex = slides.length > 0 ? (slideIndex - 1 + TREND_TIPS.length) % TREND_TIPS.length : 0
  const notificationTip = TREND_TIPS[0]

  return (
    <>
      <div className={styles.container}>
        {/* Notification Bubble */}
        {showNotification && !isOpen && (
          <div className={styles.notifBubble}>
            <div className={styles.notifIcon}><TrendingUp size={16} /></div>
            <div className={styles.notifBody}>
              <p className={styles.notifTitle}>{notificationTip.title}</p>
              <p className={styles.notifText}>{notificationTip.text.substring(0, 45)}...</p>
            </div>
            <button className={styles.closeNotif} onClick={(e) => { e.stopPropagation(); setShowNotification(false) }}>
              <X size={12} />
            </button>
          </div>
        )}

        {/* Main Orb: Only visible when the panel is closed */}
        {!isOpen && (
          <button 
            className={`${styles.orb} ${showNotification ? styles.orbAlert : ''}`}
            onClick={toggleCoach}
          >
            <div className={styles.orbInner}>
              <Sparkles size={20} className={styles.sparkle} />
            </div>
            <div className={styles.orbPulse} />
          </button>
        )}

        {/* Expanded Panel */}
        {isOpen && (
          <div className={`glass-card ${styles.panel}`}>
            <div className={styles.panelHeader}>
              <div className={styles.panelTitle}>
                <Sparkles size={16} className={styles.zapIcon} />
                AI Content Coach
              </div>
              <button className={styles.closeBtn} onClick={() => setIsOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <div className={styles.panelContent}>
              {/* Wrapper with relative positioning for overlay buttons */}
              <div className={styles.carouselWrapper}>
                {/* Carousel Viewport */}
                <div className={styles.carouselViewport}>
                  <div 
                    className={`${styles.carouselTrack} ${enableTransition ? styles.transition : ''}`}
                    style={{ transform: `translateX(-${slideIndex * 100}%)` }}
                    onTransitionEnd={handleTransitionEnd}
                  >
                    {slides.map((tip, idx) => (
                      <div key={`${tip.id}-${idx}`} className={styles.slide}>
                        <div className={styles.tipCard}>
                          <div className={styles.tipHeader}>
                            <div className={styles.tipIconWrap}><TrendingUp size={16} /></div>
                            <span className={styles.categoryBadge}>{tip.category}</span>
                          </div>
                          <h4 className={styles.tipTitle}>{tip.title}</h4>
                          <p className={styles.tipText}>{tip.text}</p>
                          
                          <button className={styles.actionBtn} onClick={() => handleActionClick(tip.ideas)}>
                            {tip.action} <ArrowRight size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  className={`${styles.navBtnSide} ${styles.navLeft}`}
                  onClick={handlePrev}
                  disabled={isAnimating}
                  aria-label="Previous"
                >
                  <ChevronLeft size={16} />
                </button>

                <button
                  className={`${styles.navBtnSide} ${styles.navRight}`}
                  onClick={handleNext}
                  disabled={isAnimating}
                  aria-label="Next"
                >
                  <ChevronRight size={16} />
                </button>
              </div>

              {/* Pagination indicator only */}
              <div className={styles.paginationWrap}>
                <span className={styles.pagination}>
                  {realIndex + 1} / {TREND_TIPS.length}
                </span>
              </div>

              <div className={styles.panelFooter}>
                <p>Trợ lý AI đang học phong cách của bạn...</p>
                <div className={styles.learningBar}>
                  <div className={styles.learningProgress} style={{ width: '65%' }} />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Embedded Generator Modal (when a trend is clicked) */}
      {generatorIdeas && (
        <AIIdeaGenerator
          presetResults={generatorIdeas}
          onClose={() => setGeneratorIdeas(null)}
          onSelectIdea={(idea) => {
            openCreatePost({ initialContent: idea.description, source: 'coach' })
            setGeneratorIdeas(null)
          }}
        />
      )}
    </>
  )
}