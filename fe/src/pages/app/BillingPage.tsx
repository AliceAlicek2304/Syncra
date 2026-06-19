import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  CreditCard, Check, ExternalLink, X, AlertCircle, Zap, Users, Clock
} from 'lucide-react';
import { useBilling } from '../../context/BillingContext';
import { useWorkspace } from '../../context/WorkspaceContext';
import styles from './BillingPage.module.css';

const PLANS = [
  {
    code: 'BASIC',
    name: 'Basic',
    price: { month: 99000, year: 79000 },
    features: [
      '20 Social Media Connections',
      'Unlimited scheduled posts',
      'Basic analytics',
      'Content editor',
      'Community support',
      'AI assistant (limited)',
    ],
    icon: <Clock size={20} />
  },
  {
    code: 'PRO',
    name: 'Pro',
    price: { month: 149000, year: 119000 },
    features: [
      'Up to 50 Social Media Connections',
      'Unlimited scheduled posts',
      'Advanced analytics',
      'Best-time scheduling',
      'Content recycling',
      'Priority support',
      'AI assistant',
    ],
    icon: <Zap size={20} />,
    highlight: true
  },
  {
    code: 'MAX',
    name: 'Max',
    price: { month: 199000, year: 159000 },
    features: [
      'Everything in Pro',
      'Up to 10 team members',
      'Custom brand kits',
      'White-label reports',
      'API access',
      'Dedicated support',
      'Custom integrations',
    ],
    icon: <Users size={20} />
  }
];

export default function BillingPage() {
  const {
    subscription, loading, error, redirecting,
    loadCurrentSubscription, startCheckout, openPortal
  } = useBilling();
  const { activeWorkspace } = useWorkspace();
  const [searchParams, setSearchParams] = useSearchParams();
  const [yearly, setYearly] = useState(false);
  const [banner, setBanner] = useState<{ type: 'success' | 'info' | 'error', message: string } | null>(null);

  useEffect(() => {
    if (activeWorkspace) {
      loadCurrentSubscription();
    }
  }, [activeWorkspace, loadCurrentSubscription]);

  useEffect(() => {
    const billingStatus = searchParams.get('billing');
    if (billingStatus) {
      if (billingStatus === 'success') {
        setBanner({ type: 'success', message: 'Subscription updated successfully! Your new features are now active.' });
        loadCurrentSubscription();
      } else if (billingStatus === 'cancel') {
        setBanner({ type: 'info', message: 'Checkout canceled. Your current plan remains unchanged.' });
      } else if (billingStatus === 'portal_return') {
        setBanner({ type: 'success', message: 'Returned from billing management. Subscription state refreshed.' });
        loadCurrentSubscription();
      }

      const newParams = new URLSearchParams(searchParams);
      newParams.delete('billing');
      setSearchParams(newParams, { replace: true });
    }
  }, [searchParams, setSearchParams, loadCurrentSubscription]);

  const handleCheckout = async (planCode: string) => {
    await startCheckout(planCode, yearly ? 'year' : 'month', !isEligibleForTrial);
  };

  const handleOpenPortal = async () => {
    await openPortal();
  };

  const currentPlanCode = subscription?.planCode || null;
  const displayStatus = (subscription?.status || 'inactive').toLowerCase();
  const isEligibleForTrial = subscription?.isDefault === true && !subscription?.trialEndsAtUtc;

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('vi-VN', {
      year: 'numeric', month: 'long', day: 'numeric'
    });
  };

  const nextEventDate = subscription?.trialEndsAtUtc || subscription?.endsAtUtc;
  const nextEventLabel = subscription?.trialEndsAtUtc ? 'Trial ends on' : 'Next billing date';

  if (loading && !subscription) {
    return (
      <div className={styles.page}>
        <div className={styles.loadingOverlay}>
          <div className={styles.spinner} />
          <p>Loading billing details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        {/* Header */}
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>
              <CreditCard size={22} />
              Billing & Subscription
            </h1>
            <p className={styles.subtitle}>Manage your plan and payment details.</p>
          </div>
          {subscription && !subscription.isDefault && (
            <button className={styles.portalBtn} onClick={handleOpenPortal} disabled={redirecting}>
              {redirecting ? 'Redirecting...' : <>
                Manage Billing <ExternalLink size={14} />
              </>}
            </button>
          )}
        </div>

        {/* Banner */}
        {banner && (
          <div className={`${styles.banner} ${styles[`banner${banner.type.charAt(0).toUpperCase() + banner.type.slice(1)}`]}`}>
            <span>
              {banner.type === 'success' ? <Check size={18} /> : <AlertCircle size={18} />}
              {banner.message}
            </span>
            <button className={styles.bannerClose} onClick={() => setBanner(null)}>
              <X size={16} />
            </button>
          </div>
        )}

        {error && (
          <div className={`${styles.banner} ${styles.bannerError}`}>
            <span><AlertCircle size={18} /> {error}</span>
            <button className={styles.bannerClose} onClick={() => loadCurrentSubscription()}>
              Refresh
            </button>
          </div>
        )}

        {/* Subscription Summary */}
        <div className={styles.summaryGrid}>
          <div className={styles.summaryCard}>
            <span className={styles.summaryLabel}>Current Plan</span>
            <span className={styles.summaryValue}>
              {subscription?.planName || (subscription?.isDefault ? 'No active plan' : '')}
            </span>
          </div>
          <div className={styles.summaryCard}>
            <span className={styles.summaryLabel}>Status</span>
            <span className={`${styles.statusBadge} ${styles[`status${displayStatus.charAt(0).toUpperCase() + displayStatus.slice(1)}`] || ''}`}>
              {displayStatus.toUpperCase()}
            </span>
          </div>
          <div className={styles.summaryCard}>
            <span className={styles.summaryLabel}>{nextEventLabel}</span>
            <span className={styles.summaryValue}>{formatDate(nextEventDate)}</span>
          </div>
        </div>

        {/* Toggle */}
        <div className={styles.toggleSection}>
          <span className={`${styles.toggleLabel} ${!yearly ? styles.toggleActive : ''}`}>Monthly</span>
          <button
            className={`${styles.toggleBtn} ${yearly ? styles.toggleBtnOn : ''}`}
            onClick={() => setYearly(!yearly)}
            disabled={redirecting}
          >
            <div className={styles.toggleThumb} />
          </button>
          <span className={`${styles.toggleLabel} ${yearly ? styles.toggleActive : ''}`}>
            Yearly <span className={styles.saveBadge}>Save 20%</span>
          </span>
        </div>

        {/* Pricing Cards */}
        <div className={styles.pricingGrid}>
          {PLANS.map(plan => {
            const isCurrent = currentPlanCode === plan.code;
            const price = yearly ? plan.price.year : plan.price.month;

            return (
              <div key={plan.code} className={`${styles.planCard} ${isCurrent ? styles.currentPlanCard : ''}`}>
                {isCurrent && <span className={styles.currentBadge}>Current Plan</span>}
                <div className={styles.planHeader}>
                  <span className={styles.planIcon}>{plan.icon}</span>
                  <span className={styles.planName}>{plan.name}</span>
                </div>
                <div className={styles.planPrice}>
                  <span className={styles.priceAmount}>{price.toLocaleString('vi-VN')}<span className={styles.priceCurrency}>đ</span></span>
                  <span className={styles.pricePeriod}>/month</span>
                </div>
                <ul className={styles.featureList}>
                  {plan.features.map(f => (
                    <li key={f} className={styles.featureItem}>
                      <Check size={14} className={styles.featureIcon} />
                      {f}
                    </li>
                  ))}
                </ul>
                <div className={styles.planAction}>
                  {isCurrent ? (
                    <span className={styles.currentLabel}>Active</span>
                  ) : (
                    <button className={styles.actionBtn} onClick={() => handleCheckout(plan.code)} disabled={redirecting}>
                      {redirecting ? 'Redirecting...' : (isEligibleForTrial ? 'Start 14-day Free Trial' : `Upgrade to ${plan.name}`)}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
