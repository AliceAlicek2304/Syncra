import { AlertTriangle } from 'lucide-react';
import styles from './WidgetErrorFallback.module.css';

interface WidgetErrorFallbackProps {
  error: unknown;
  resetErrorBoundary: () => void;
}

export function WidgetErrorFallback({ resetErrorBoundary }: WidgetErrorFallbackProps) {
  return (
    <div className={styles.container} role="alert" data-testid="widget-error-fallback">
      <AlertTriangle size={24} color="var(--pink-400)" aria-hidden="true" />
      <h3 className={styles.heading}>Something went wrong</h3>
      <p className={styles.body}>This widget encountered an error and couldn't load.</p>
      <button className="btn-glass" onClick={resetErrorBoundary}>
        Try again
      </button>
    </div>
  );
}
