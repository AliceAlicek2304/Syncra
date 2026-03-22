import { useEffect } from 'react'
import { CheckCircle2, XCircle } from 'lucide-react'
import { useToast } from '../context/ToastContext'
import styles from './Toast.module.css'

export type { ToastItem } from '../types/toast'

export default function Toast() {
  const { toasts, dismissToast } = useToast()

  useEffect(() => {
    if (toasts.length === 0) return
    const latest = toasts[toasts.length - 1]
    const timer = setTimeout(() => dismissToast(latest.id), 3000)
    return () => clearTimeout(timer)
  }, [toasts, dismissToast])

  if (toasts.length === 0) return null

  return (
    <div className={styles.wrapper}>
      {toasts.map(t => (
        <div key={t.id} className={`${styles.toast} ${styles[t.type]}`} onClick={() => dismissToast(t.id)}>
          <span className={styles.icon}>
            {t.type === 'success' ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
          </span>
          {t.message}
        </div>
      ))}
    </div>
  )
}
