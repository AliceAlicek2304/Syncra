import { Lock, Check, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import styles from './SubscriptionUpgradeModal.module.css';

interface SubscriptionUpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const FEATURES = [
  'Unlimited social accounts',
  'Schedule posts',
  'Analytics & insights',
];

export default function SubscriptionUpgradeModal({ isOpen, onClose }: SubscriptionUpgradeModalProps) {
  const navigate = useNavigate();

  if (!isOpen) return null;

  const handleUpgrade = () => {
    onClose();
    navigate('/app/billing');
  };

  return (
    <div className={styles.backdrop} role="dialog" aria-modal="true">
      <div className={styles.card}>
        <button className={styles.closeBtn} onClick={onClose} aria-label="Close">
          <X size={18} />
        </button>

        <div className={styles.iconWrap}>
          <Lock size={28} className={styles.lockIcon} />
        </div>

        <h2 className={styles.heading}>Connect Social Accounts</h2>

        <p className={styles.body}>
          Social account connections are available on Basic, Pro, and Max plans.
        </p>

        <ul className={styles.featureList}>
          {FEATURES.map(f => (
            <li key={f} className={styles.featureItem}>
              <Check size={16} className={styles.featureIcon} />
              <span>{f}</span>
            </li>
          ))}
        </ul>

        <div className={styles.actions}>
          <button className={styles.upgradeBtn} onClick={handleUpgrade}>
            Upgrade Plan
          </button>
          <button className={styles.cancelBtn} onClick={onClose}>
            Maybe Later
          </button>
        </div>
      </div>
    </div>
  );
}
