import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { ReactNode } from 'react';
import Toast, { type ToastItem } from '../components/Toast';
import { shortId } from '../utils/shortId';
import { registerErrorHandler } from '../lib/axios';

interface ToastContextType {
  addToast: (toast: Omit<ToastItem, 'id'>) => void;
  removeToast: (id: string) => void;
  error: (message: string) => void;
  success: (message: string) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const addToast = useCallback((t: Omit<ToastItem, 'id'>) => {
    const id = shortId();
    setToasts((prev) => [...prev, { ...t, id }]);
    
    // Auto remove after 5s
    setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, 5000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const error = useCallback((message: string) => {
    addToast({ message, type: 'error' });
  }, [addToast]);

  const success = useCallback((message: string) => {
    addToast({ message, type: 'success' });
  }, [addToast]);

  useEffect(() => {
    registerErrorHandler((msg) => {
      error(msg);
    });
  }, [error]);

  return (
    <ToastContext.Provider value={{ addToast, removeToast, error, success }}>
      {children}
      <Toast toasts={toasts} onDismiss={removeToast} />
    </ToastContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
