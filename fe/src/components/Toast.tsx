import { useEffect } from 'react'
import { CheckCircle2, XCircle } from 'lucide-react'
import styles from './Toast.module.css'

export interface ToastItem {
  id: string
  message: string
  type: 'success' | 'error'
}

interface ToastProps {
  toasts: ToastItem[]
  onDismiss: (id: string) => void
}

export default function Toast({ toasts, onDismiss }: ToastProps) {
  useEffect(() => {
    if (toasts.length === 0) return
    const latest = toasts[toasts.length - 1]
    const timer = setTimeout(() => onDismiss(latest.id), 3000)
    return () => clearTimeout(timer)
  }, [toasts, onDismiss])

  if (toasts.length === 0) return null

  return (
    <div className={styles.wrapper}>
      {toasts.map(t => (
        <div key={t.id} className={`${styles.toast} ${styles[t.type]}`} onClick={() => onDismiss(t.id)}>
          <span className={styles.icon}>
            {t.type === 'success' ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
          </span>
          {t.message}
        </div>
      ))}
    </div>
  )
}
