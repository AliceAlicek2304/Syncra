import { useState, useEffect } from 'react'
import styles from './OnboardingTour.module.css'

interface Step {
  title: string
  description: string
  target?: string // Optional CSS selector for highlighting element
}

const TOUR_STEPS: Step[] = [
  {
    title: 'Chào mừng tới Syncra! 🚀',
    description: 'Nền tảng giúp bạn làm chủ content đa kênh một cách chuyên nghiệp và tiết kiệm thời gian nhất.',
  },
  {
    title: 'Theo dõi chỉ số thông minh',
    description: 'Mọi dữ liệu về Reach, Engagement từ các platform được tổng hợp tại Dashboard để bạn nắm bắt hiệu suất nhanh chóng.',
  },
  {
    title: 'Sáng tạo cùng AI Assistant',
    description: 'Chỉ cần một chủ đề, AI của chúng tôi sẽ gợi ý ý tưởng, hook và caption tối ưu cho từng nền tảng riêng biệt.',
  },
  {
    title: 'Lên lịch & Quản lý',
    description: 'Quản lý bài đăng của bạn trên tất cả các nền tảng thông qua bộ Calendar trực quan.',
  },
]

export default function OnboardingTour() {
  const [show, setShow] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)

  useEffect(() => {
    const hasCompletedTour = localStorage.getItem('syncra_onboarding_completed')
    if (!hasCompletedTour) {
      // Delay a bit to let dashboard load
      const timer = setTimeout(() => setShow(true), 1200)
      return () => clearTimeout(timer)
    }
  }, [])

  const handleNext = () => {
    if (currentStep < TOUR_STEPS.length - 1) {
      setCurrentStep(s => s + 1)
    } else {
      handleComplete()
    }
  }

  const handleComplete = () => {
    localStorage.setItem('syncra_onboarding_completed', 'true')
    setShow(false)
  }

  if (!show) return null

  const step = TOUR_STEPS[currentStep]

  return (
    <div className={styles.overlay}>
      <div className={`glass-card ${styles.tourCard}`}>
        <div className={styles.stepIndicator}>
          {TOUR_STEPS.map((_, i) => (
            <div 
              key={i} 
              className={`${styles.dot} ${i === currentStep ? styles.dotActive : ''}`} 
            />
          ))}
        </div>

        <div className={styles.content}>
          <h3 className={styles.title}>{step.title}</h3>
          <p className={styles.description}>{step.description}</p>
        </div>

        <div className={styles.footer}>
          <button className={styles.skipBtn} onClick={handleComplete}>Skip tour</button>
          <button className={`btn-primary ${styles.nextBtn}`} onClick={handleNext}>
            {currentStep === TOUR_STEPS.length - 1 ? 'Khám phá ngay' : 'Tiếp theo'}
          </button>
        </div>
      </div>
    </div>
  )
}
