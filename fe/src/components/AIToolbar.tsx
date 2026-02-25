import { useEffect, useState, useRef } from 'react'
import { Sparkles, Type, Smile, Zap, RefreshCw } from 'lucide-react'
import styles from './AIToolbar.module.css'

interface AIToolbarProps {
  selection: { text: string; start: number; end: number } | null
  position: { top: number; left: number } | null
  onAction: (transformedText: string) => void
  onClose: () => void
}

export default function AIToolbar({ selection, position, onAction, onClose }: AIToolbarProps) {
  const [isProcessing, setIsProcessing] = useState(false)
  const toolbarRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (toolbarRef.current && !toolbarRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [onClose])

  if (!selection || !position) return null

  const handleTransform = (type: 'shorten' | 'emoji' | 'tone') => {
    setIsProcessing(true)
    
    // Mocking the AI transformation delay
    setTimeout(() => {
      let result = selection.text
      if (type === 'shorten') {
        result = selection.text.split(' ').slice(0, Math.ceil(selection.text.split(' ').length * 0.6)).join(' ') + '...'
      } else if (type === 'emoji') {
        result = `✨ ${selection.text} 🔥`
      } else if (type === 'tone') {
        result = `[Professional version of: ${selection.text}]`
      }
      
      onAction(result)
      setIsProcessing(false)
      onClose()
    }, 1200)
  }

  return (
    <div 
      ref={toolbarRef}
      className={styles.toolbar}
      style={{ top: position.top, left: position.left }}
    >
      {isProcessing ? (
        <div className={styles.processing}>
          <RefreshCw size={14} className={styles.spin} />
          <span>AI đang xử soạn...</span>
        </div>
      ) : (
        <>
          <button className={styles.btn} onClick={() => handleTransform('shorten')} title="Làm ngắn lại">
            <Zap size={14} /> <span>Ngắn gọn</span>
          </button>
          <div className={styles.divider} />
          <button className={styles.btn} onClick={() => handleTransform('emoji')} title="Thêm cảm xúc">
            <Smile size={14} /> <span>Emoji</span>
          </button>
          <div className={styles.divider} />
          <button className={styles.btn} onClick={() => handleTransform('tone')} title="Đổi giọng văn">
            <Type size={14} /> <span>Pro</span>
          </button>
          <div className={styles.divider} />
          <button className={styles.magicBtn} onClick={() => handleTransform('tone')}>
            <Sparkles size={14} />
          </button>
        </>
      )}
    </div>
  )
}
