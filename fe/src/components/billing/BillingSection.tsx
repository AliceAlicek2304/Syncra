import React, { useEffect, useState, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { 
  CreditCard, 
  Calendar, 
  Shield, 
  Check, 
  ExternalLink, 
  X, 
  Lock, 
  AlertCircle,
  Clock,
  Zap,
  Users
} from 'lucide-react';
import { useBilling } from '../../context/BillingContext';
import styles from './BillingSection.module.css';

const PLANS = [
  {
    code: 'FREE',
    name: 'Free',
    price: { month: 0, year: 0 },
    features: [
      '5 posts per month',
      '2 platform connections',
      'Basic AI assistant',
      'Standard analytics'
    ],
    icon: <Clock size={20} />
  },
  {
    code: 'PRO',
    name: 'Pro',
    price: { month: 149000, year: 119000 },
    features: [
      'Unlimited scheduled posts',
      'Up to 50 connections',
      'Advanced AI assistant',
      'Priority support',
      'Repurpose tools'
    ],
    icon: <Zap size={20} />,
    highlight: true
  },
  {
    code: 'TEAM',
    name: 'Team',
    price: { month: 299000, year: 239000 },
    features: [
      'Everything in Pro',
      'Up to 10 team members',
      'Brand kits',
      'White-label reports',
      'API access'
    ],
    icon: <Users size={20} />
  }
];

export default function BillingSection() {
  const { 
    subscription, 
    loading, 
    error, 
    redirecting, 
    loadCurrentSubscription, 
    startCheckout, 
    openPortal 
  } = useBilling();

  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [yearly, setYearly] = useState(false);
  const [banner, setBanner] = useState<{ type: 'success' | 'info' | 'error', message: string } | null>(null);

  const isOwner = localStorage.getItem('syncra_is_owner') !== 'false';

  // 1. Initial Load
  useEffect(() => {
    loadCurrentSubscription();
  }, [loadCurrentSubscription]);

  // 2. Handle Return Banners
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

      // Remove the query param without refreshing
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('billing');
      setSearchParams(newParams, { replace: true });
    }
  }, [searchParams, setSearchParams, loadCurrentSubscription]);

  const handleCheckout = async (planCode: string) => {
    if (!isOwner) return;
    const interval = yearly ? 'year' : 'month';
    await startCheckout(planCode, interval);
  };

  const handleOpenPortal = async () => {
    if (!isOwner) return;
    await openPortal();
  };

  const currentPlanCode = subscription?.planCode || 'FREE';
  const displayStatus = (subscription?.status || 'inactive').toLowerCase();

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const nextEventDate = subscription?.trialEndsAtUtc || subscription?.endsAtUtc;
  const nextEventLabel = subscription?.trialEndsAtUtc ? 'Trial ends on' : 'Next billing date';

  if (loading && !subscription) {
    return (
      <section className={`glass-card ${styles.section}`}>
        <div className={styles.loadingOverlay}>
          <div className={styles.spinner} />
          <p>Loading billing details...</p>
        </div>
      </section>
    );
  }

  return (
    <section className={`glass-card ${styles.section}`}>
      <div className={styles.sectionHeader}>
        <div className={styles.sectionInfo}>
          <h2 className={styles.sectionTitle}><CreditCard size={18} /> Billing & Subscription</h2>
          <p className={styles.sectionDesc}>Quản lý gói dịch vụ và phương thức thanh toán của bạn.</p>
        </div>
      </div>

      {banner && (
        <div className={`${styles.banner} ${styles[`banner${banner.type.charAt(0).toUpperCase() + banner.type.slice(1)}` as any]}`}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {banner.type === 'success' ? <Check size={18} /> : <AlertCircle size={18} />}
            <span>{banner.message}</span>
          </div>
          <button className={styles.bannerClose} onClick={() => setBanner(null)}>
            <X size={16} />
          </button>
        </div>
      )}

      {error && (
        <div className={`${styles.banner} ${styles.bannerError}`}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
          <button className={styles.bannerClose} onClick={() => loadCurrentSubscription()}>
            Refresh
          </button>
        </div>
      )}

      {/* Subscription Summary */}
      <div className={styles.summaryGrid}>
        <div className={styles.summaryCard}>
          <span className={styles.summaryLabel}>Current Plan</span>
          <div className={styles.summaryValue}>{subscription?.planName || 'Free Plan'}</div>
        </div>
        <div className={styles.summaryCard}>
          <span className={styles.summaryLabel}>Status</span>
          <div className={styles.summaryValue}>
            <span className={`${styles.statusBadge} ${styles[`status${displayStatus.charAt(0).toUpperCase() + displayStatus.slice(1)}` as any] || ''}`}>
              {displayStatus.toUpperCase()}
            </span>
          </div>
        </div>
        <div className={styles.summaryCard}>
          <span className={styles.summaryLabel}>{nextEventLabel}</span>
          <div className={styles.summaryValue}>{formatDate(nextEventDate)}</div>
        </div>
      </div>

      {/* Pricing Toggle */}
      <div className={styles.pricingHeader}>
        <h3 className={styles.sectionTitle} style={{ justifyContent: 'center' }}>Choose Your Plan</h3>
        <div className={styles.toggleContainer}>
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
      </div>

      {/* Pricing Grid */}
      <div className={styles.pricingGrid}>
        {PLANS.map(plan => {
          const isCurrent = currentPlanCode === plan.code;
          const price = yearly ? plan.price.year : plan.price.month;
          
          return (
            <div key={plan.code} className={`glass-card ${styles.planCard} ${isCurrent ? styles.currentPlanCard : ''}`}>
              {isCurrent && <div className={styles.currentPlanBadge}>Current Plan</div>}
              
              <div className={styles.planName}>{plan.name}</div>
              
              <div className={styles.planPrice}>
                <span className={styles.priceAmount}>{price.toLocaleString('vi-VN')} đ</span>
                <span className={styles.pricePeriod}> / month</span>
              </div>

              <ul className={styles.featureList}>
                {plan.features.map(f => (
                  <li key={f} className={styles.featureItem}>
                    <Check size={14} className={styles.featureIcon} />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              {!isCurrent && (
                isOwner ? (
                  <button 
                    className={plan.highlight ? 'btn-primary' : 'btn-ghost'}
                    style={{ width: '100%', justifyContent: 'center' }}
                    onClick={() => handleCheckout(plan.code)}
                    disabled={redirecting}
                  >
                    {redirecting ? 'Redirecting...' : `Upgrade to ${plan.name}`}
                  </button>
                ) : (
                  <div className={styles.ownerOnlyNotice}>
                    <Lock size={14} className={styles.ownerOnlyIcon} />
                    <span>Only the workspace owner can manage billing actions.</span>
                  </div>
                )
              )}
            </div>
          );
        })}
      </div>

      {/* Manage Billing Portal */}
      {subscription && !subscription.isDefault && (
        <div className={styles.portalSection}>
          <div className={styles.portalInfo}>
            <h3>Payment Methods & Invoices</h3>
            <p>Update your billing details or download past invoices.</p>
          </div>
          {isOwner ? (
            <button 
              className="btn-ghost"
              onClick={handleOpenPortal}
              disabled={redirecting}
            >
              {redirecting ? 'Redirecting...' : (
                <>
                  Manage Billing <ExternalLink size={14} style={{ marginLeft: 8 }} />
                </>
              )}
            </button>
          ) : (
            <div className={styles.ownerOnlyNotice}>
              <Lock size={14} className={styles.ownerOnlyIcon} />
              <span>Only the workspace owner can manage billing actions.</span>
            </div>
          )}
        </div>
      )}
      
      {error && error.includes('open billing portal') && (
        <p style={{ color: '#ef4444', fontSize: '13px', marginTop: '12px', textAlign: 'right' }}>
          Could not open billing portal. Please try again.
        </p>
      )}
    </section>
  );
}
