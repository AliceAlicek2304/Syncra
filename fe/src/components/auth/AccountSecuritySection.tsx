import { useState } from 'react';
import { authApi } from '../../api/auth';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import styles from './AccountSecuritySection.module.css';

export default function AccountSecuritySection() {
  const { user } = useAuth();
  const { success: showSuccess, error: showError } = useToast();
  const [isResending, setIsResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const isEmailVerified = !!user?.emailVerifiedAtUtc;
  const userEmail = user?.email || '';

  const handleResendVerificationEmail = async () => {
    if (!userEmail || isResending || resendCooldown > 0) return;

    setIsResending(true);
    try {
      await authApi.resendVerificationEmail(userEmail);
      showSuccess('Verification email sent! Check your inbox.');

      // Start 60-second cooldown (rate limiting per D-04)
      setResendCooldown(60);
      const interval = setInterval(() => {
        setResendCooldown(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err: unknown) {
      const errorMessage = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        || 'Failed to send verification email. Please try again.';
      showError(errorMessage);
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className={styles.section}>
      <h3 className={styles.title}>Account Security</h3>

      <div className={styles.setting}>
        <div className={styles.settingContent}>
          <label className={styles.label}>Email Verification</label>
          <p className={styles.description}>
            {isEmailVerified
              ? 'Your email address has been verified.'
              : 'Your email address has not been verified yet. Click the link in your verification email to verify it.'}
          </p>
          {userEmail && (
            <p className={styles.email}>{userEmail}</p>
          )}
        </div>

        {!isEmailVerified && (
          <button
            onClick={handleResendVerificationEmail}
            disabled={isResending || resendCooldown > 0}
            className={styles.actionBtn}
          >
            {resendCooldown > 0
              ? `Resend in ${resendCooldown}s`
              : isResending
              ? 'Sending...'
              : 'Resend Verification Email'}
          </button>
        )}

        {isEmailVerified && (
          <div className={styles.verifiedBadge}>Verified</div>
        )}
      </div>
    </div>
  );
}
