import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { authApi } from '../../api/auth';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import styles from './LoginModal.module.css';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

interface LoginModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function LoginModal({ onClose, onSuccess }: LoginModalProps) {
  const { login } = useAuth();
  const { error: showError } = useToast();
  const navigate = useNavigate();
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const { ref, focusFirst } = useFocusTrap(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormValues) => {
    setIsSubmitting(true);
    try {
      await login(data);
      onSuccess();
    } catch (err: unknown) {
      console.error('Login error:', err);
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Invalid email or password';
      showError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const { loginUrl } = await authApi.getOAuthLoginUrl('google', '/app/connections');
      window.location.href = loginUrl;
    } catch (err: unknown) {
      console.error('Google login error:', err);
      showError('Failed to initiate Google login');
    }
  };

  useEffect(() => {
    previousFocusRef.current = document.activeElement as HTMLElement;
    return () => {
      previousFocusRef.current?.focus();
    };
  }, []);

  useEffect(() => {
    focusFirst();
  }, [focusFirst]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div className={styles.modal} role="dialog" aria-modal="true" ref={ref} onClick={(e) => e.stopPropagation()}>
        <button className={styles.closeBtn} aria-label="Close modal" onClick={onClose}>
          <X size={20} />
        </button>

        <div className={styles.header}>
          <h2 className={styles.title}>Welcome back</h2>
          <p className={styles.subtitle}>Enter your details to sign in</p>
        </div>

        <button
          type="button"
          className={styles.googleBtn}
          aria-label="Sign in with Google"
          onClick={handleGoogleLogin}
        >
          <svg className={styles.googleIcon} viewBox="0 0 24 24" width="20" height="20">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continue with Google
        </button>

        <div className={styles.divider}>
          <span>or</span>
        </div>

        <form className={styles.form} onSubmit={handleSubmit(onSubmit)}>
          <div className={styles.field}>
            <label className={styles.label}>Email</label>
            <input
              type="email"
              data-testid="login-email"
              aria-required="true"
              className={`${styles.input} ${errors.email ? styles.inputError : ''}`}
              placeholder="name@example.com"
              {...register('email')}
            />
            {errors.email && <span className={styles.errorText}>{errors.email.message}</span>}
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Password</label>
            <input
              type="password"
              data-testid="login-password"
              aria-required="true"
              className={`${styles.input} ${errors.password ? styles.inputError : ''}`}
              placeholder="••••••••"
              {...register('password')}
            />
            {errors.password && <span className={styles.errorText}>{errors.password.message}</span>}
          </div>

          <Link to="/forgot-password" className={styles.forgotLink}>
            Forgot password?
          </Link>

          <button type="submit" data-testid="login-submit" className={styles.submitBtn} disabled={isSubmitting}>
            {isSubmitting ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <div className={styles.footer}>
          Don't have an account?
          <button onClick={() => navigate('/signup')} className={styles.link}>Sign up</button>
        </div>
      </div>
    </div>
  );
}
