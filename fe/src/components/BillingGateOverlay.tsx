import { AlertTriangle, ExternalLink, X } from 'lucide-react';
import styles from './BillingGateOverlay.module.css';

export interface BillingGateOverlayProps {
  isOpen: boolean;
  reason: string;
  dashboardUrl: string;
  onClose: () => void;
}

const REASON_MESSAGES: Record<string, string> = {
  twitter_passthrough:
    'Your current plan does not include Twitter/X passthrough publishing. Upgrade your subscription to connect and schedule posts to Twitter/X.',
  free_tier_exceeded:
    'You have reached the platform connection limit for the Free plan. Upgrade to connect additional social accounts.',
  enterprise_required:
    'This platform integration requires an Enterprise subscription. Please upgrade your plan to proceed.',
};

function getReasonMessage(reason: string): string {
  return (
    REASON_MESSAGES[reason] ??
    'Your current subscription plan does not support this action. Upgrade to unlock full platform access.'
  );
}

export default function BillingGateOverlay({
  isOpen,
  reason,
  dashboardUrl,
  onClose,
}: BillingGateOverlayProps) {
  if (!isOpen) return null;

  const handleUpgrade = () => {
    window.open(dashboardUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className={styles.backdrop} role="dialog" aria-modal="true" aria-labelledby="billing-overlay-title">
      <div className={styles.card}>
        <button className={styles.closeBtn} onClick={onClose} aria-label="Close">
          <X size={18} />
        </button>

        <div className={styles.iconWrap}>
          <AlertTriangle size={32} className={styles.warningIcon} />
        </div>

        <h2 id="billing-overlay-title" className={styles.heading}>
          Subscription Upgrade Required
        </h2>

        <p className={styles.body}>{getReasonMessage(reason)}</p>

        <div className={styles.actions}>
          <button className={styles.upgradBtn} onClick={handleUpgrade}>
            Upgrade Plan
            <ExternalLink size={14} className={styles.btnIcon} />
          </button>
          <button className={styles.cancelBtn} onClick={onClose}>
            Keep Current Plan
          </button>
        </div>
      </div>
    </div>
  );
}
