import { Upload, FileImage, FileVideo } from 'lucide-react'
import { useState, useEffect } from 'react'
import styles from './GlassUpload.module.css'

export default function GlassUpload() {
  const [isDragging, setIsDragging] = useState(false)
  const [dragCounter, setDragCounter] = useState(0)

  useEffect(() => {
    const handleDragEnter = (e: DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setDragCounter(prev => prev + 1)
      if (e.dataTransfer?.items && e.dataTransfer.items.length > 0) {
        setIsDragging(true)
      }
    }

    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setDragCounter(prev => prev - 1)
      if (dragCounter <= 1) {
        setIsDragging(false)
        setDragCounter(0)
      }
    }

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
    }

    const handleDrop = (e: DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(false)
      setDragCounter(0)
      
      const files = e.dataTransfer?.files
      if (files && files.length > 0) {
        console.log('Dropped files:', files)
        alert(`Đã nhận ${files.length} file! (Tính năng upload đang được tích hợp)`)
      }
    }

    window.addEventListener('dragenter', handleDragEnter)
    window.addEventListener('dragleave', handleDragLeave)
    window.addEventListener('dragover', handleDragOver)
    window.addEventListener('drop', handleDrop)

    return () => {
      window.removeEventListener('dragenter', handleDragEnter)
      window.removeEventListener('dragleave', handleDragLeave)
      window.removeEventListener('dragover', handleDragOver)
      window.removeEventListener('drop', handleDrop)
    }
  }, [dragCounter])

  if (!isDragging) return null

  return (
    <div className={styles.overlay}>
      <div className={styles.glassContainer}>
        <div className={styles.content}>
          <div className={styles.iconCircle}>
            <Upload size={48} className={styles.mainIcon} />
            <div className={styles.orbit}>
              <FileImage size={24} className={styles.secondaryIcon} />
              <FileVideo size={24} className={styles.secondaryIcon} />
            </div>
          </div>
          <h2 className={styles.title}>Drop your media here</h2>
          <p className={styles.subtitle}>Upload ảnh hoặc video để lên lịch bài đăng ngay lập tức</p>
          <div className={styles.platforms}>
            <span className={styles.badge}>TikTok</span>
            <span className={styles.badge}>Instagram</span>
            <span className={styles.badge}>YouTube</span>
          </div>
        </div>
        <div className={styles.borderBeam} />
      </div>
    </div>
  )
}
