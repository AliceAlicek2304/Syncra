import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Lock } from 'lucide-react';
import { authApi } from '../../api/auth';
import { useToast } from '../../context/ToastContext';
import styles from './LinkAccountModal.module.css';

const linkAccountSchema = z.object({
  password: z.string().min(1, 'Password is required'),
});

type LinkAccountFormValues = z.infer<typeof linkAccountSchema>;

interface LinkAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  email: string;
  providerKey: string;
  avatarUrl?: string;
  onLinkSuccess: (token: string, refreshToken: string, expiresAtUtc: string) => void;
}

export default function LinkAccountModal({
  isOpen,
  onClose,
  email,
  providerKey,
  avatarUrl,
  onLinkSuccess,
}: LinkAccountModalProps) {
  const { error: showError } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<LinkAccountFormValues>({
    resolver: zodResolver(linkAccountSchema),
  });

  useEffect(() => {
    if (isOpen) {
      reset();
    }
  }, [isOpen, reset]);

  const onSubmit = async (data: LinkAccountFormValues) => {
    setIsSubmitting(true);
    try {
      setSubmitError(null);
      const response = await authApi.linkAccount({
        email,
        password: data.password,
        provider: 'google',
        providerKey,
      });
      onLinkSuccess(response.token, response.refreshToken, response.expiresAtUtc);
    } catch (err: unknown) {
      console.error('Link account error:', err);
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Invalid password';
      setSubmitError(message);
      showError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button className={styles.closeBtn} onClick={onClose}>
          <X size={20} />
        </button>

        <div className={styles.header}>
          {avatarUrl ? (
            <div className="mx-auto mb-4 relative">
              <img 
                src={avatarUrl} 
                alt={email} 
                className="h-20 w-20 rounded-full border-2 border-brand-primary/30 object-cover mx-auto"
              />
              <div className="absolute -bottom-1 -right-1 bg-brand-canvas p-1.5 rounded-full border border-brand-primary/30">
                <Lock size={14} className="text-brand-primary" />
              </div>
            </div>
          ) : (
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-brand-primary/10 text-brand-primary">
              <Lock size={24} />
            </div>
          )}
          <h2 className={styles.title}>Account Linking</h2>
          <p className={styles.subtitle}>
            We found an existing account with <strong>{email}</strong>. 
            Enter your password to link Google sign-in.
          </p>
        </div>

        <form className={styles.form} onSubmit={handleSubmit(onSubmit)}>
          <div className={`${styles.errorWrapper} ${submitError ? styles.errorVisible : ''}`}>
            {submitError && (
              <div className={styles.alert}>
                <div className="flex items-center gap-2 text-red-500">
                  <X size={16} />
                  <span className="text-xs font-semibold">{submitError}</span>
                </div>
              </div>
            )}
          </div>

          <div className={styles.field}>
            <div className="flex items-center justify-between">
              <label className={styles.label}>Password</label>
              <a href="#" className="text-xs font-medium text-brand-primary hover:text-brand-primary-hover transition-colors">
                Forgot password?
              </a>
            </div>
            <input
              type="password"
              className={`${styles.input} ${(errors.password || submitError) ? styles.inputError : ''}`}
              placeholder="••••••••"
              autoFocus
              {...register('password', { onChange: () => setSubmitError(null) })}
            />
            {errors.password && <span className={styles.errorText}>{errors.password.message}</span>}
          </div>

          <button type="submit" className={styles.submitBtn} disabled={isSubmitting}>
            {isSubmitting ? (
              <div className="flex items-center justify-center gap-2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                <span>Linking...</span>
              </div>
            ) : (
              'Link Account'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
