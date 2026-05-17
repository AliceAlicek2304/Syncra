import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useSearchParams, Link } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import { authApi } from '../api/auth';
import styles from './ResetPasswordPage.module.css';

const resetPasswordSchema = z.object({
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

export default function ResetPasswordPage() {
  const { error: showError } = useToast();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [tokenError, setTokenError] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
  });

  useEffect(() => {
    if (!token) {
      setTokenError(true);
    }
  }, [token]);

  const onSubmit = async (data: ResetPasswordFormValues) => {
    if (!token) return;
    setIsSubmitting(true);
    try {
      await authApi.resetPassword(token, data.newPassword);
      setSubmitted(true);
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'The reset link is invalid or has expired.';
      showError(message);
      setTokenError(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (tokenError) {
    return (
      <div className={styles.page}>
        <div className={styles.card}>
          <div className={styles.header}>
            <h2 className={styles.title}>Invalid or expired link</h2>
            <p className={styles.subtitle}>
              This password reset link is invalid or has expired. Please request a new one.
            </p>
          </div>
          <Link to="/forgot-password" className={styles.submitBtn} style={{ textAlign: 'center', textDecoration: 'none', display: 'block' }}>
            Request new reset link
          </Link>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className={styles.page}>
        <div className={styles.card}>
          <div className={styles.header}>
            <h2 className={styles.title}>Password reset successful</h2>
            <p className={styles.subtitle}>
              Your password has been reset successfully. You can now sign in with your new password.
            </p>
          </div>
          <Link to="/login" className={styles.submitBtn} style={{ textAlign: 'center', textDecoration: 'none', display: 'block' }}>
            Sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.header}>
          <h2 className={styles.title}>Reset your password</h2>
          <p className={styles.subtitle}>
            Enter your new password below.
          </p>
        </div>

        <form className={styles.form} onSubmit={handleSubmit(onSubmit)}>
          <div className={styles.field}>
            <label className={styles.label}>New password</label>
            <input
              type="password"
              aria-required="true"
              className={`${styles.input} ${errors.newPassword ? styles.inputError : ''}`}
              placeholder="At least 8 characters"
              {...register('newPassword')}
            />
            {errors.newPassword && <span className={styles.errorText}>{errors.newPassword.message}</span>}
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Confirm password</label>
            <input
              type="password"
              aria-required="true"
              className={`${styles.input} ${errors.confirmPassword ? styles.inputError : ''}`}
              placeholder="Re-enter your new password"
              {...register('confirmPassword')}
            />
            {errors.confirmPassword && <span className={styles.errorText}>{errors.confirmPassword.message}</span>}
          </div>

          <button type="submit" className={styles.submitBtn} disabled={isSubmitting}>
            {isSubmitting ? 'Resetting...' : 'Reset password'}
          </button>
        </form>
      </div>
    </div>
  );
}
