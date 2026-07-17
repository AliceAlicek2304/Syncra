import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Copy, Check, AlertTriangle, Clock } from 'lucide-react';
import { useBilling } from '../../context/BillingContext';
import styles from './SePayCheckoutPage.module.css';

export default function SePayCheckoutPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { subscription, loadCurrentSubscription } = useBilling();

  const paymentCode = searchParams.get('code') || '';
  const amountStr = searchParams.get('amount') || '0';
  const originalAmountStr = searchParams.get('originalAmount') || '';
  const discountCode = searchParams.get('discountCode') || '';
  const discountPercent = searchParams.get('discountPercent') || '';
  const discountAmountStr = searchParams.get('discountAmount') || '';
  const planCode = searchParams.get('plan') || '';
  const interval = searchParams.get('interval') || 'month';

  const amount = parseInt(amountStr, 10);
  const originalAmount = originalAmountStr ? parseInt(originalAmountStr, 10) : 0;
  const discountAmount = discountAmountStr ? parseInt(discountAmountStr, 10) : Math.max(0, originalAmount - amount);
  const hasDiscount = !!discountCode && originalAmount > amount;
  const discountLabel = discountPercent && discountPercent !== ''
    ? `${discountCode} -${discountPercent}%`
    : `${discountCode} -${discountAmount.toLocaleString('vi-VN')} đ`;

  const accountNumber = searchParams.get('accountNumber') || import.meta.env.VITE_SEPAY_ACCOUNT_NUMBER || '1017588888';
  const bankCode = searchParams.get('bankCode') || import.meta.env.VITE_SEPAY_BANK_CODE || 'Vietinbank';
  const accountName = searchParams.get('accountName') || import.meta.env.VITE_SEPAY_ACCOUNT_NAME || 'CONG TY CO PHAN SYNCRA';

  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(900);
  const isSuccess = !!subscription &&
    subscription.planCode?.toUpperCase() === planCode.toUpperCase() &&
    subscription.status?.toLowerCase() === 'active';

  useEffect(() => {
    if (isSuccess) return;

    const intervalId = setInterval(async () => {
      await loadCurrentSubscription();
    }, 5000);

    return () => clearInterval(intervalId);
  }, [loadCurrentSubscription, isSuccess]);

  useEffect(() => {
    if (!isSuccess) return;

    const timeoutId = setTimeout(() => {
      navigate(`/app/connections?billing=success`);
    }, 3000);

    return () => clearTimeout(timeoutId);
  }, [isSuccess, navigate]);

  useEffect(() => {
    if (timeLeft <= 0 || isSuccess) return;

    const timerId = setTimeout(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);

    return () => clearTimeout(timerId);
  }, [timeLeft, isSuccess]);

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => {
      setCopiedField(null);
    }, 1500);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const qrUrl = `https://qr.sepay.vn/img?acc=${accountNumber}&bank=${bankCode}&amount=${amount}&des=${paymentCode}&template=compact`;

  if (isSuccess) {
    return (
      <div className={styles.container}>
        <div className={styles.checkoutCard} style={{ maxWidth: '500px' }}>
          <div className={styles.successContainer}>
            <div className={styles.checkmarkWrapper}>
              <Check size={48} />
            </div>
            <h2 className={styles.successTitle}>Thanh Toán Thành Công!</h2>
            <p className={styles.successDesc}>
              Hệ thống đã nhận được chuyển khoản của bạn. Đang thiết lập tài khoản...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.checkoutCard}>
        <div className={styles.header}>
          <button className={styles.backBtn} onClick={() => navigate(-1)} title="Quay lại">
            <ArrowLeft size={18} />
          </button>
          <h2 className={styles.title}>Thanh toán nâng cấp gói</h2>
        </div>

        <div className={styles.grid}>
          <div className={styles.leftCol}>
            <div className={styles.summarySection}>
              <div className={styles.summaryRow}>
                <span className={styles.summaryLabel}>Gói cước nâng cấp</span>
                <span className={styles.summaryValue}>Syncra {planCode} ({interval === 'year' ? '1 Năm' : '1 Tháng'})</span>
              </div>
              {hasDiscount && (
                <div className={styles.summaryRow}>
                  <span className={styles.summaryLabel}>Ưu đãi</span>
                  <span className={styles.summaryValue}>{discountLabel}</span>
                </div>
              )}
              {hasDiscount && (
                <div className={styles.summaryRow}>
                  <span className={styles.summaryLabel}>Giá gốc</span>
                  <span className={styles.summaryValue}>{originalAmount.toLocaleString('vi-VN')} đ</span>
                </div>
              )}
              <div className={styles.summaryRow}>
                <span className={styles.summaryLabel}>Tổng số tiền</span>
                <span className={`${styles.summaryValue} ${styles.priceTotal}`}>
                  {amount.toLocaleString('vi-VN')} đ
                </span>
              </div>
            </div>

            <div className={styles.instructionsSection}>
              <h3 className={styles.sectionSubtitle}>Thông tin chuyển khoản</h3>

              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Ngân hàng thụ hưởng</span>
                <div className={styles.infoValueContainer}>
                  <span className={styles.infoValue}>{bankCode}</span>
                </div>
              </div>

              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Số tài khoản</span>
                <div className={styles.infoValueContainer}>
                  <span className={styles.infoValue}>{accountNumber}</span>
                  <button
                    className={styles.copyBtn}
                    onClick={() => handleCopy(accountNumber, 'acc')}
                  >
                    <Copy size={12} /> Sao chép
                  </button>
                </div>
                {copiedField === 'acc' && <span className={styles.tooltip}>Đã sao chép!</span>}
              </div>

              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Tên tài khoản nhận</span>
                <div className={styles.infoValueContainer}>
                  <span className={styles.infoValue}>{accountName}</span>
                </div>
              </div>

              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Số tiền chuyển</span>
                <div className={styles.infoValueContainer}>
                  <span className={`${styles.infoValue} ${styles.highlightValue}`}>
                    {amount.toLocaleString('vi-VN')} đ
                  </span>
                  <button
                    className={styles.copyBtn}
                    onClick={() => handleCopy(amount.toString(), 'amount')}
                  >
                    <Copy size={12} /> Sao chép
                  </button>
                </div>
                {copiedField === 'amount' && <span className={styles.tooltip}>Đã sao chép!</span>}
              </div>

              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Nội dung chuyển khoản</span>
                <div className={styles.infoValueContainer}>
                  <span className={`${styles.infoValue} ${styles.highlightValue}`}>{paymentCode}</span>
                  <button
                    className={styles.copyBtn}
                    onClick={() => handleCopy(paymentCode, 'code')}
                  >
                    <Copy size={12} /> Sao chép
                  </button>
                </div>
                {copiedField === 'code' && <span className={styles.tooltip}>Đã sao chép!</span>}
              </div>
            </div>

            <div className={styles.alertBox}>
              <AlertTriangle className={styles.alertIcon} size={18} />
              <p className={styles.alertText}>
                <strong>QUAN TRỌNG:</strong> Vui lòng chuyển khoản đúng số tiền và điền chính xác nội dung chuyển khoản{' '}
                <strong>{paymentCode}</strong> ở trên để hệ thống kích hoạt tự động.
              </p>
            </div>
          </div>

          <div className={styles.rightCol}>
            <h3 className={styles.sectionSubtitle} style={{ marginBottom: 16 }}>Quét mã VietQR thanh toán</h3>

            <div className={styles.qrContainer}>
              <img src={qrUrl} alt="Mã VietQR SePay" className={styles.qrImage} />
            </div>

            <div className={styles.timer}>
              <Clock size={14} />
              <span>Thời gian hiệu lực: <strong>{formatTime(timeLeft)}</strong></span>
            </div>

            <div className={styles.statusIndicator}>
              <div className={styles.spinner} />
              <span className={styles.statusText}>Đang chờ thanh toán...</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
