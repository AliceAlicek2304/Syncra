import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, Link } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import { authApi } from '../api/auth';
import styles from './ForgotPasswordPage.module.css';

const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email'),
});

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const { error: showError } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordFormValues) => {
    setIsSubmitting(true);
    try {
      await authApi.forgotPassword(data.email);
      setSubmitted(true);
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Something went wrong. Please try again.';
      showError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className={styles.page}>
        <div className={styles.card}>
          <div className={styles.header}>
            <h2 className={styles.title}>Check your email</h2>
            <p className={styles.subtitle}>
              If an account with that email exists, a password reset link has been sent.
            </p>
          </div>
          <button
            onClick={() => navigate('/login')}
            className={styles.submitBtn}
          >
            Back to sign in
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.header}>
          <h2 className={styles.title}>Forgot password?</h2>
          <p className={styles.subtitle}>
            Enter your email and we'll send you a reset link.
          </p>
        </div>

        <form className={styles.form} onSubmit={handleSubmit(onSubmit)}>
          <div className={styles.field}>
            <label className={styles.label}>Email</label>
            <input
              type="email"
              aria-required="true"
              className={`${styles.input} ${errors.email ? styles.inputError : ''}`}
              placeholder="name@example.com"
              {...register('email')}
            />
            {errors.email && <span className={styles.errorText}>{errors.email.message}</span>}
          </div>

          <button type="submit" className={styles.submitBtn} disabled={isSubmitting}>
            {isSubmitting ? 'Sending...' : 'Send reset link'}
          </button>
        </form>

        <div className={styles.footer}>
          Remember your password?
          <Link to="/login" className={styles.link}>Sign in</Link>
        </div>
      </div>
    </div>
  );
}
