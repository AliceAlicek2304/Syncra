import React, { useState, useEffect } from 'react'
import { Sparkles, X, Lightbulb, TrendingUp, Calendar, Zap, ArrowRight } from 'lucide-react'
import styles from './AICoach.module.css'

interface CoachTip {
  id: string
  icon: React.ReactNode
  title: string
  text: string
  category: 'trend' | 'schedule' | 'optimization'
  action: string
}

const TIPS: CoachTip[] = [
  {
    id: '1',
    icon: <TrendingUp size={16} />,
    title: 'Hot Trend Alert!',
    text: 'Hashtag #TechLifestyle đang tăng trưởng 40% trong 2 giờ qua. Bạn có muốn tạo bài mới không?',
    category: 'trend',
    action: 'Tạo bài ngay'
  },
  {
    id: '2',
    icon: <Calendar size={16} />,
    title: 'Giờ vàng sắp tới',
    text: '19:00 là thời điểm follower của bạn hoạt động mạnh nhất trên TikTok. Đừng quên đăng bài nhé!',
    category: 'schedule',
    action: 'Xem lịch'
  },
  {
    id: '3',
    icon: <Lightbulb size={16} />,
    title: 'Mẹo tối ưu Hook',
    text: 'Thử bắt đầu caption bằng một câu hỏi gây tò mò sẽ tăng tỷ lệ đọc hết thêm 15%.',
    category: 'optimization',
    action: 'Thử ngay'
  }
]

export default function AICoach() {
  const [isOpen, setIsOpen] = useState(false)
  const [showNotification, setShowNotification] = useState(false)
  const [currentTip] = useState<CoachTip>(TIPS[0])

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

  return (
    <div className={styles.container}>
      {/* Notification Bubble */}
      {showNotification && !isOpen && (
        <div className={styles.notifBubble}>
          <div className={styles.notifIcon}>{currentTip.icon}</div>
          <div className={styles.notifBody}>
            <p className={styles.notifTitle}>{currentTip.title}</p>
            <p className={styles.notifText}>{currentTip.text.substring(0, 30)}...</p>
          </div>
          <button className={styles.closeNotif} onClick={(e) => { e.stopPropagation(); setShowNotification(false) }}>
            <X size={12} />
          </button>
        </div>
      )}

      {/* Main Orb */}
      <button 
        className={`${styles.orb} ${isOpen ? styles.orbOpen : ''} ${showNotification ? styles.orbAlert : ''}`}
        onClick={toggleCoach}
      >
        <div className={styles.orbInner}>
          <Sparkles size={isOpen ? 22 : 20} className={styles.sparkle} />
        </div>
        <div className={styles.orbPulse} />
      </button>

      {/* Expanded Panel */}
      {isOpen && (
        <div className={`glass-card ${styles.panel}`}>
          <div className={styles.panelHeader}>
            <div className={styles.panelTitle}>
              <Zap size={16} className={styles.zapIcon} />
              AI Content Coach
            </div>
            <button className={styles.closeBtn} onClick={() => setIsOpen(false)}>
              <X size={18} />
            </button>
          </div>

          <div className={styles.panelContent}>
            <div className={styles.tipCard}>
              <div className={styles.tipHeader}>
                <div className={styles.tipIconWrap}>{currentTip.icon}</div>
                <span className={styles.categoryBadge}>{currentTip.category}</span>
              </div>
              <h4 className={styles.tipTitle}>{currentTip.title}</h4>
              <p className={styles.tipText}>{currentTip.text}</p>
              
              <button className={styles.actionBtn}>
                {currentTip.action} <ArrowRight size={14} />
              </button>
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
  )
}
