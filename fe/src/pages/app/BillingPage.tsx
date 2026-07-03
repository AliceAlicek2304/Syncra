import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  AlertCircle,
  Check,
  Clock,
  CreditCard,
  ExternalLink,
  GraduationCap,
  Percent,
  Sparkles,
  Users,
  X,
  Zap
} from 'lucide-react';
import { useBilling } from '../../context/BillingContext';
import { useWorkspace } from '../../context/WorkspaceContext';
import { ApiError } from '../../utils/api';
import type { BillingVoucherPreviewResponse } from '../../types/billing';
import styles from './BillingPage.module.css';

const PLANS = [
  {
    code: 'BASIC',
    name: 'Basic',
    price: { month: 99000, year: 79000 },
    studentDiscountEligible: true,
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
    studentDiscountEligible: false,
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
    studentDiscountEligible: true,
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
  }
];

const STUDENT_DISCOUNT_CODE = 'STUDENT50';
const STUDENT_DISCOUNT_PERCENT = 50;

const getStudentVerificationErrorMessage = (err: unknown) => {
  if (err instanceof ApiError) {
    if (err.code === 'student_email_already_used') {
      return 'Email sinh viên này đã được liên kết với một tài khoản khác.';
    }

    if (err.code === 'invalid_student_email') {
      return 'Vui lòng dùng email sinh viên hợp lệ có đuôi .edu hoặc .edu.vn.';
    }
  }

  return err instanceof Error ? err.message : 'Không xác thực được email sinh viên.';
};

const getVoucherErrorMessage = (err: unknown) => {
  if (err instanceof ApiError) {
    const messages: Record<string, string> = {
      voucher_code_required: 'Vui lòng nhập mã giảm giá.',
      voucher_not_found: 'Mã giảm giá không tồn tại.',
      voucher_inactive: 'Mã giảm giá đã bị tắt.',
      voucher_not_started: 'Mã giảm giá chưa đến thời gian sử dụng.',
      voucher_expired: 'Mã giảm giá đã hết hạn.',
      voucher_plan_not_applicable: 'Mã giảm giá không áp dụng cho gói này.',
      voucher_interval_not_applicable: 'Mã giảm giá không áp dụng cho chu kỳ thanh toán này.',
      voucher_minimum_amount_not_met: 'Đơn hàng chưa đạt giá trị tối thiểu để dùng mã này.',
      student_verification_required: 'Bạn cần xác thực sinh viên trước khi dùng mã ưu đãi sinh viên.',
      voucher_max_redemptions_reached: 'Mã giảm giá đã hết lượt sử dụng.',
      voucher_user_redemptions_reached: 'Tài khoản này đã dùng hết lượt cho mã giảm giá này.',
      voucher_invalid_configuration: 'Cấu hình mã giảm giá không hợp lệ.'
    };

    if (err.code && messages[err.code]) {
      return messages[err.code];
    }
  }

  return err instanceof Error ? err.message : 'Không áp dụng được mã giảm giá.';
};

export default function BillingPage() {
  const {
    subscription, loading, error, redirecting, studentStatus,
    loadCurrentSubscription, loadStudentVerificationStatus,
    requestStudentVerificationCode,
    previewBillingVoucher,
    startCheckout, openPortal
  } = useBilling();
  const { activeWorkspace } = useWorkspace();
  const [searchParams, setSearchParams] = useSearchParams();
  const [yearly, setYearly] = useState(false);
  const [studentEmail, setStudentEmail] = useState('');
  const [voucherCode, setVoucherCode] = useState('');
  const [appliedVoucherCode, setAppliedVoucherCode] = useState('');
  
  const [studentLoading, setStudentLoading] = useState(false);
  const [voucherChecking, setVoucherChecking] = useState(false);
  const [voucherPreviews, setVoucherPreviews] = useState<Record<string, BillingVoucherPreviewResponse>>({});
  const [voucherPreviewMessage, setVoucherPreviewMessage] = useState<string | null>(null);
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
  const hasStudentDiscount = studentStatus?.isVerified === true;
  const enteredVoucherCode = voucherCode.trim().toUpperCase();
  const activeVoucherCode = appliedVoucherCode;

  const clearVoucherState = () => {
    setAppliedVoucherCode('');
    setVoucherPreviews({});
    setVoucherPreviewMessage(null);
  };

  const handleVoucherCodeChange = (value: string) => {
    const normalized = value.toUpperCase();
    setVoucherCode(normalized);

    if (!normalized.trim() || normalized.trim() !== appliedVoucherCode) {
      clearVoucherState();
    }
  };

  const handleApplyVoucher = async () => {
    if (!enteredVoucherCode) {
      clearVoucherState();
      setVoucherPreviewMessage('Vui lòng nhập mã giảm giá.');
      return;
    }

    setVoucherChecking(true);
    setVoucherPreviewMessage(null);
    setAppliedVoucherCode('');

    const results = await Promise.allSettled(
      PLANS.map(async (plan) => {
        const preview = await previewBillingVoucher(plan.code, yearly ? 'year' : 'month', enteredVoucherCode);
        return [plan.code, preview] as const;
      })
    );

    const nextPreviews: Record<string, BillingVoucherPreviewResponse> = {};
    const errors: string[] = [];

    results.forEach((result) => {
      if (result.status === 'fulfilled') {
        nextPreviews[result.value[0]] = result.value[1];
      } else {
        errors.push(getVoucherErrorMessage(result.reason));
      }
    });

    const hasValidPreview = Object.keys(nextPreviews).length > 0;
    setVoucherPreviews(nextPreviews);
    setVoucherPreviewMessage(
      hasValidPreview
        ? `${enteredVoucherCode} áp dụng được cho ${Object.keys(nextPreviews).join(', ')}.`
        : errors[0] ?? 'Không áp dụng được mã giảm giá.'
    );
    setAppliedVoucherCode(hasValidPreview ? enteredVoucherCode : '');
    setVoucherChecking(false);
  };

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return 'Chưa có';
    return new Date(dateStr).toLocaleDateString('vi-VN', {
      year: 'numeric', month: 'long', day: 'numeric'
    });
  };

  const handleCheckout = async (planCode: string) => {
    const plan = PLANS.find(item => item.code === planCode);
    const discountCode = activeVoucherCode || (plan?.studentDiscountEligible && hasStudentDiscount
      ? STUDENT_DISCOUNT_CODE
      : null);
    const skipTrial = !!discountCode || !isEligibleForTrial;

    if (discountCode) {
      setVoucherChecking(true);
      setBanner(null);
      try {
        await previewBillingVoucher(planCode, yearly ? 'year' : 'month', discountCode);
      } catch (err) {
        setBanner({ type: 'error', message: getVoucherErrorMessage(err) });
        setVoucherChecking(false);
        return;
      }
      setVoucherChecking(false);
    }

    await startCheckout(planCode, yearly ? 'year' : 'month', skipTrial, discountCode);
  };

  const handleRequestStudentCode = async () => {
    setStudentLoading(true);
    setBanner(null);
    try {
      await requestStudentVerificationCode(studentEmail);
      setBanner({ type: 'success', message: 'Email sinh viên đã được xác thực. Basic và Max đã được giảm 50%.' });
    } catch (err) {
      setBanner({ type: 'error', message: getStudentVerificationErrorMessage(err) });
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

        {studentStatus && !studentStatus.isVerified && (
        <div className={styles.studentPanel}>
          <div className={styles.studentCopy}>
            <span className={styles.studentIcon}><GraduationCap size={20} /></span>
            <div>
              <h2>Ưu đãi sinh viên giảm 50%</h2>
              <p>Xác thực bằng email .edu hoặc .edu.vn để giảm 50% cho Basic và Max. Pro giữ nguyên giá.</p>
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
            <button className={styles.actionBtnCompact} onClick={handleRequestStudentCode} disabled={studentLoading || !studentEmail.trim()}>
              Xác thực email
            </button>
          </div>
          <div className={styles.studentStatus}>
            {studentStatus?.isVerified ? (
              <span><Check size={14} /> Đã xác thực đến {formatDate(studentStatus.expiresAtUtc)}</span>
            ) : (
              <span><Sparkles size={14} /> Xác thực email sinh viên để mở khóa giảm giá Basic và Max.</span>
            )}
          </div>
        </div>
        )}

        <div className={styles.voucherPanel}>
          <div className={styles.voucherCopy}>
            <span className={styles.voucherIcon}><Percent size={18} /></span>
            <div>
              <h2>Mã giảm giá</h2>
              <p>Nhập mã ưu đãi rồi chọn gói để hệ thống kiểm tra và áp dụng khi thanh toán.</p>
            </div>
          </div>
          <div className={styles.voucherControls}>
            <input
              value={voucherCode}
              onChange={e => handleVoucherCodeChange(e.target.value)}
              placeholder="VD: STUDENT50"
              className={styles.codeInput}
              disabled={redirecting || voucherChecking}
            />
            <button
              className={styles.actionBtnCompact}
              onClick={handleApplyVoucher}
              disabled={redirecting || voucherChecking || !enteredVoucherCode}
            >
              {voucherChecking ? 'Đang kiểm tra...' : 'Xác nhận'}
            </button>
            {voucherCode.trim() && (
              <button
                className={styles.secondaryBtn}
                onClick={() => {
                  setVoucherCode('');
                  clearVoucherState();
                }}
                disabled={redirecting || voucherChecking}
              >
                Xóa mã
              </button>
            )}
          </div>
          <div className={styles.voucherHint}>
            {hasStudentDiscount
              ? 'Nếu để trống, Basic và Max sẽ tự áp ưu đãi sinh viên 50%.'
              : 'Mã sinh viên cần xác thực email sinh viên trước khi sử dụng.'}
          </div>
          {(voucherChecking || voucherPreviewMessage) && (
            <div className={`${styles.voucherPreview} ${Object.keys(voucherPreviews).length > 0 ? styles.voucherPreviewOk : styles.voucherPreviewError}`}>
              {voucherChecking ? 'Đang kiểm tra mã...' : voucherPreviewMessage}
            </div>
          )}
        </div>

        <div className={styles.toggleSection}>
          <span className={`${styles.toggleLabel} ${!yearly ? styles.toggleActive : ''}`}>Theo tháng</span>
          <button
            className={`${styles.toggleBtn} ${yearly ? styles.toggleBtnOn : ''}`}
            onClick={() => {
              setYearly(!yearly);
              if (activeVoucherCode) {
                clearVoucherState();
              }
            }}
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
            const basePrice = yearly ? plan.price.year : plan.price.month;
            const studentLocked = false;
            const voucherPreview = activeVoucherCode ? voucherPreviews[plan.code] : null;
            const studentDiscounted = !activeVoucherCode && plan.studentDiscountEligible && hasStudentDiscount;
            const discounted = !!voucherPreview || studentDiscounted;
            const price = voucherPreview
              ? voucherPreview.finalAmount
              : studentDiscounted
              ? Math.round(basePrice * (100 - STUDENT_DISCOUNT_PERCENT) / 100)
              : basePrice;
            const discountLine = voucherPreview
              ? `Đã áp dụng ${voucherPreview.code} -${voucherPreview.discountAmount.toLocaleString('vi-VN')}đ`
              : studentDiscounted
                ? 'Đã áp dụng -50% sinh viên'
                : null;

            return (
              <div key={plan.code} className={`${styles.planCard} ${plan.highlight ? styles.highlightPlanCard : ''} ${isCurrent ? styles.currentPlanCard : ''}`}>
                {isCurrent && <span className={styles.currentBadge}>Gói hiện tại</span>}
                {discounted && <span className={styles.studentBadge}>{voucherPreview ? voucherPreview.code : '-50% sinh viên'}</span>}
                <div className={styles.planHeader}>
                  <span className={styles.planIcon}>{plan.icon}</span>
                  <span className={styles.planName}>{plan.name}</span>
                </div>
                <div className={styles.planPrice}>
                  {discountLine && <span className={styles.studentDiscountLine}>{discountLine}</span>}
                  {discounted && (
                    <span className={styles.originalPrice}>
                      {basePrice.toLocaleString('vi-VN')}đ
                    </span>
                  )}
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
                    <button className={styles.actionBtn} onClick={() => handleCheckout(plan.code)} disabled={redirecting || voucherChecking || studentLocked}>
                      {redirecting || voucherChecking
                        ? 'Đang chuyển...'
                          : discounted
                            ? `Mua ưu đãi ${plan.name}`
                          : studentLocked
                            ? 'Cần xác thực sinh viên'
                            : (isEligibleForTrial ? 'Dùng thử 14 ngày' : `Nâng cấp ${plan.name}`)}
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
