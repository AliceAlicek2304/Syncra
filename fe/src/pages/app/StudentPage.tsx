import { useEffect, useState } from 'react';
import { AlertCircle, Check, GraduationCap, Sparkles } from 'lucide-react';
import { useBilling } from '../../context/BillingContext';
import { ApiError } from '../../utils/api';
import styles from './StudentPage.module.css';

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

export default function StudentPage() {
  const { studentStatus, loadStudentVerificationStatus, requestStudentVerificationCode } = useBilling();
  const [studentEmail, setStudentEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    loadStudentVerificationStatus();
  }, [loadStudentVerificationStatus]);

  useEffect(() => {
    if (studentStatus?.studentEmail) {
      setStudentEmail(studentStatus.studentEmail);
    }
  }, [studentStatus?.studentEmail]);

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return 'Chưa có';
    return new Date(dateStr).toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const handleVerify = async () => {
    setLoading(true);
    setNotice(null);

    try {
      await requestStudentVerificationCode(studentEmail);
      setNotice({
        type: 'success',
        message: 'Email sinh viên đã được liên kết với tài khoản của bạn.',
      });
    } catch (err) {
      setNotice({ type: 'error', message: getStudentVerificationErrorMessage(err) });
    } finally {
      setLoading(false);
    }
  };

  const isVerified = studentStatus?.isVerified === true;

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <header className={styles.header}>
          <div className={styles.iconWrap}>
            <GraduationCap size={24} />
          </div>
          <div>
            <h1 className={styles.title}>Sinh viên</h1>
            <p className={styles.subtitle}>Liên kết email sinh viên để giảm 50% cho Basic và Max.</p>
          </div>
        </header>

        {notice && (
          <div className={`${styles.notice} ${notice.type === 'success' ? styles.noticeSuccess : styles.noticeError}`}>
            {notice.type === 'success' ? <Check size={18} /> : <AlertCircle size={18} />}
            <span>{notice.message}</span>
          </div>
        )}

        <section className={styles.card}>
          {isVerified ? (
            <>
              <div className={styles.statusHeader}>
                <span className={styles.successIcon}><Check size={20} /></span>
                <div>
                  <h2>Đã xác thực sinh viên</h2>
                  <p>Email này đang được liên kết với tài khoản của bạn.</p>
                </div>
              </div>

              <div className={styles.detailGrid}>
                <div>
                  <span>Email sinh viên</span>
                  <strong>{studentStatus?.studentEmail}</strong>
                </div>
                <div>
                  <span>Có hiệu lực đến</span>
                  <strong>{formatDate(studentStatus?.expiresAtUtc)}</strong>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className={styles.statusHeader}>
                <span className={styles.pendingIcon}><Sparkles size={20} /></span>
                <div>
                  <h2>Xác thực email sinh viên</h2>
                  <p>Nhập email có đuôi .edu hoặc .edu.vn. Email này chỉ dùng được cho một tài khoản.</p>
                </div>
              </div>

              <div className={styles.formRow}>
                <input
                  value={studentEmail}
                  onChange={e => setStudentEmail(e.target.value)}
                  placeholder="ten@truong.edu.vn"
                  className={styles.input}
                  disabled={loading}
                />
                <button className={styles.button} onClick={handleVerify} disabled={loading || !studentEmail.trim()}>
                  {loading ? 'Đang xác thực...' : 'Xác thực'}
                </button>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
