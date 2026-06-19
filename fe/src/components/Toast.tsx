
export interface ToastItem {
  id: string
  message: string
  type: 'success' | 'error'
}

interface ToastProps {
  toasts: ToastItem[]
  onDismiss: (id: string) => void
}

export default function Toast({ toasts: _toasts, onDismiss: _onDismiss }: ToastProps) {
  return null;
}
