import { X, CheckCircle2, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from './ui/alert';

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
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 max-w-sm">
      {toasts.map((toast) => (
        <Alert key={toast.id} variant={toast.type === 'error' ? 'destructive' : 'success'} className="pr-10 shadow-lg">
          {toast.type === 'error' ? (
            <AlertCircle className="h-4 w-4" />
          ) : (
            <CheckCircle2 className="h-4 w-4" />
          )}
          <AlertDescription>{toast.message}</AlertDescription>
          <button
            onClick={() => onDismiss(toast.id)}
            className="absolute top-3 right-3 text-brand-body-mid hover:text-brand-ink transition-colors"
            aria-label="Dismiss"
          >
            <X size={14} />
          </button>
        </Alert>
      ))}
    </div>
  );
}
