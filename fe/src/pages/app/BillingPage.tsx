import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  AlertCircle,
  Check,
  Clock,
  CreditCard,
  ExternalLink,
  GraduationCap,
  Sparkles,
  Users,
  X,
  Zap
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
      '20 kết nối mạng xã hội',
      'Lên lịch bài đăng không giới hạn',
      'Phân tích cơ bản',
      'Trình soạn nội dung',
      'Hỗ trợ cộng đồng',
      'Trợ lý AI giới hạn',
    ],
    icon: <Clock size={20} />
  },
  {
    code: 'PRO',
    name: 'Pro',
    price: { month: 149000, year: 119000 },
    features: [
      'Tối đa 50 kết nối mạng xã hội',
      'Lên lịch bài đăng không giới hạn',
      'Phân tích nâng cao',
      'Gợi ý giờ đăng tốt nhất',
      'Tái sử dụng nội dung',
      'Hỗ trợ ưu tiên',
      'Trợ lý AI',
    ],
    icon: <Zap size={20} />,
    highlight: true
  },
  {
    code: 'MAX',
    name: 'Max',
    price: { month: 199000, year: 159000 },
    features: [
      'Tất cả tính năng của Pro',
      'Tối đa 10 thành viên',
      'Brand kit tuỳ chỉnh',
      'Báo cáo white-label',
      'Quyền truy cập API',
      'Hỗ trợ riêng',
      'Tích hợp tuỳ chỉnh',
    ],
    icon: <Users size={20} />
  },
  {
    code: 'STUDENT',
    name: 'Student',
    price: { month: 59000, year: 49000 },
    features: [
      'Dành cho email sinh viên .edu hoặc .edu.vn',
      '20 kết nối mạng xã hội',
      'Lên lịch bài đăng không giới hạn',
      'Trình soạn nội dung',
      'Trợ lý AI giới hạn',
      'Xác thực lại sau 12 tháng',
    ],
    icon: <GraduationCap size={20} />,
    studentOnly: true
  }
];

export default function BillingPage() {
  const {
    subscription, loading, error, redirecting, studentStatus,
    loadCurrentSubscription, loadStudentVerificationStatus,
    requestStudentVerificationCode, verifyStudentEmailCode,
    startCheckout, openPortal
  } = useBilling();
  const { activeWorkspace } = useWorkspace();
  const [searchParams, setSearchParams] = useSearchParams();
  const [yearly, setYearly] = useState(false);
  const [studentEmail, setStudentEmail] = useState('');
  const [studentCode, setStudentCode] = useState('');
  const [studentLoading, setStudentLoading] = useState(false);
  const [banner, setBanner] = useState<{ type: 'success' | 'info' | 'error', message: string } | null>(null);

  useEffect(() => {
    if (activeWorkspace) {
      loadCurrentSubscription();
      loadStudentVerificationStatus();
    }
  }, [activeWorkspace, loadCurrentSubscription, loadStudentVerificationStatus]);

  useEffect(() => {
    if (studentStatus?.studentEmail) {
      setStudentEmail(studentStatus.studentEmail);
    }
  }, [studentStatus?.studentEmail]);

  useEffect(() => {
    const billingStatus = searchParams.get('billing');
    if (!billingStatus) return;

    if (billingStatus === 'success') {
      setBanner({ type: 'success', message: 'Gói của bạn đã được cập nhật. Tính năng mới đã sẵn sàng.' });
      loadCurrentSubscription();
    } else if (billingStatus === 'cancel') {
      setBanner({ type: 'info', message: 'Bạn đã huỷ thanh toán. Gói hiện tại vẫn được giữ nguyên.' });
    } else if (billingStatus === 'portal_return') {
      setBanner({ type: 'success', message: 'Đã quay lại từ trang quản lý thanh toán. Dữ liệu đã được làm mới.' });
      loadCurrentSubscription();
    }

    const newParams = new URLSearchParams(searchParams);
    newParams.delete('billing');
    setSearchParams(newParams, { replace: true });
  }, [searchParams, setSearchParams, loadCurrentSubscription]);

  const currentPlanCode = subscription?.planCode || null;
  const displayStatus = (subscription?.status || 'inactive').toLowerCase();
  const isEligibleForTrial = subscription?.isDefault === true && !subscription?.trialEndsAtUtc;
  const canBuyStudentPlan = studentStatus?.isVerified === true;

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return 'Chưa có';
    return new Date(dateStr).toLocaleDateString('vi-VN', {
      year: 'numeric', month: 'long', day: 'numeric'
    });
  };

  const handleCheckout = async (planCode: string) => {
    if (planCode === 'STUDENT' && !canBuyStudentPlan) {
      setBanner({ type: 'error', message: 'Vui lòng xác thực email sinh viên trước khi mua gói Student.' });
      return;
    }

    await startCheckout(planCode, yearly ? 'year' : 'month', !isEligibleForTrial);
  };

  const handleRequestStudentCode = async () => {
    setStudentLoading(true);
    setBanner(null);
    try {
      await requestStudentVerificationCode(studentEmail);
      setBanner({ type: 'success', message: 'Mã xác thực đã được gửi tới email sinh viên của bạn.' });
    } catch (err) {
      setBanner({ type: 'error', message: err instanceof Error ? err.message : 'Không gửi được mã xác thực.' });
    } finally {
      setStudentLoading(false);
    }
  };

  const handleVerifyStudentCode = async () => {
    setStudentLoading(true);
    setBanner(null);
    try {
      await verifyStudentEmailCode(studentEmail, studentCode);
      setStudentCode('');
      setBanner({ type: 'success', message: 'Email sinh viên đã được xác thực. Bạn có thể mua gói Student.' });
    } catch (err) {
      setBanner({ type: 'error', message: err instanceof Error ? err.message : 'Mã xác thực không hợp lệ.' });
    } finally {
      setStudentLoading(false);
    }
  };

  const nextEventDate = subscription?.trialEndsAtUtc || subscription?.endsAtUtc;
  const nextEventLabel = subscription?.trialEndsAtUtc ? 'Hết hạn dùng thử' : 'Ngày gia hạn tiếp theo';

  if (loading && !subscription) {
    return (
      <div className={styles.page}>
        <div className={styles.loadingOverlay}>
          <div className={styles.spinner} />
          <p>Đang tải thông tin thanh toán...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>
              <CreditCard size={22} />
              Thanh toán & gói sử dụng
            </h1>
            <p className={styles.subtitle}>Quản lý gói, thanh toán và ưu đãi sinh viên.</p>
          </div>
          {subscription && !subscription.isDefault && (
            <button className={styles.portalBtn} onClick={openPortal} disabled={redirecting}>
              {redirecting ? 'Đang chuyển...' : <>
                Quản lý thanh toán <ExternalLink size={14} />
              </>}
            </button>
          )}
        </div>

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
              Làm mới
            </button>
          </div>
        )}

        <div className={styles.summaryGrid}>
          <div className={styles.summaryCard}>
            <span className={styles.summaryLabel}>Gói hiện tại</span>
            <span className={styles.summaryValue}>
              {subscription?.planName || (subscription?.isDefault ? 'Chưa có gói trả phí' : '')}
            </span>
          </div>
          <div className={styles.summaryCard}>
            <span className={styles.summaryLabel}>Trạng thái</span>
            <span className={`${styles.statusBadge} ${styles[`status${displayStatus.charAt(0).toUpperCase() + displayStatus.slice(1)}`] || ''}`}>
              {displayStatus.toUpperCase()}
            </span>
          </div>
          <div className={styles.summaryCard}>
            <span className={styles.summaryLabel}>{nextEventLabel}</span>
            <span className={styles.summaryValue}>{formatDate(nextEventDate)}</span>
          </div>
        </div>

        <div className={styles.studentPanel}>
          <div className={styles.studentCopy}>
            <span className={styles.studentIcon}><GraduationCap size={20} /></span>
            <div>
              <h2>Ưu đãi sinh viên 59.000đ/tháng</h2>
              <p>Xác thực bằng email .edu hoặc .edu.vn. Hiệu lực 12 tháng, sau đó cần xác thực lại.</p>
            </div>
          </div>
          <div className={styles.studentControls}>
            <input
              value={studentEmail}
              onChange={e => setStudentEmail(e.target.value)}
              placeholder="ten@truong.edu.vn"
              className={styles.studentInput}
              disabled={studentLoading}
            />
            <button className={styles.secondaryBtn} onClick={handleRequestStudentCode} disabled={studentLoading || !studentEmail.trim()}>
              Gửi mã
            </button>
            <input
              value={studentCode}
              onChange={e => setStudentCode(e.target.value)}
              placeholder="Mã 6 số"
              className={styles.codeInput}
              maxLength={6}
              disabled={studentLoading}
            />
            <button className={styles.actionBtnCompact} onClick={handleVerifyStudentCode} disabled={studentLoading || studentCode.trim().length !== 6}>
              Xác thực
            </button>
          </div>
          <div className={styles.studentStatus}>
            {studentStatus?.isVerified ? (
              <span><Check size={14} /> Đã xác thực đến {formatDate(studentStatus.expiresAtUtc)}</span>
            ) : (
              <span><Sparkles size={14} /> Xác thực email sinh viên để mở khóa gói Student.</span>
            )}
          </div>
        </div>

        <div className={styles.toggleSection}>
          <span className={`${styles.toggleLabel} ${!yearly ? styles.toggleActive : ''}`}>Theo tháng</span>
          <button
            className={`${styles.toggleBtn} ${yearly ? styles.toggleBtnOn : ''}`}
            onClick={() => setYearly(!yearly)}
            disabled={redirecting}
          >
            <div className={styles.toggleThumb} />
          </button>
          <span className={`${styles.toggleLabel} ${yearly ? styles.toggleActive : ''}`}>
            Theo năm <span className={styles.saveBadge}>Tiết kiệm 20%</span>
          </span>
        </div>

        <div className={styles.pricingGrid}>
          {PLANS.map(plan => {
            const isCurrent = currentPlanCode === plan.code;
            const price = yearly ? plan.price.year : plan.price.month;
            const studentLocked = plan.code === 'STUDENT' && !canBuyStudentPlan;

            return (
              <div key={plan.code} className={`${styles.planCard} ${plan.highlight ? styles.highlightPlanCard : ''} ${isCurrent ? styles.currentPlanCard : ''}`}>
                {isCurrent && <span className={styles.currentBadge}>Gói hiện tại</span>}
                {plan.studentOnly && <span className={styles.studentBadge}>Sinh viên</span>}
                <div className={styles.planHeader}>
                  <span className={styles.planIcon}>{plan.icon}</span>
                  <span className={styles.planName}>{plan.name}</span>
                </div>
                <div className={styles.planPrice}>
                  <span className={styles.priceAmount}>{price.toLocaleString('vi-VN')}<span className={styles.priceCurrency}>đ</span></span>
                  <span className={styles.pricePeriod}>/tháng</span>
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
                    <span className={styles.currentLabel}>Đang dùng</span>
                  ) : (
                    <button className={styles.actionBtn} onClick={() => handleCheckout(plan.code)} disabled={redirecting || studentLocked}>
                      {redirecting ? 'Đang chuyển...' : studentLocked ? 'Cần xác thực sinh viên' : (isEligibleForTrial ? 'Dùng thử 14 ngày' : `Nâng cấp ${plan.name}`)}
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
