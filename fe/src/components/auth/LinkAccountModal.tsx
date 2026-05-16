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
  onLinkSuccess: (token: string, refreshToken: string, expiresAtUtc: string) => void;
}

export default function LinkAccountModal({
  isOpen,
  onClose,
  email,
  providerKey,
  onLinkSuccess,
}: LinkAccountModalProps) {
  const { error: showError } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

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
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-purple-500/10 text-purple-500">
            <Lock size={24} />
          </div>
          <h2 className={styles.title}>Account Linking</h2>
          <p className={styles.subtitle}>
            We found an existing account with <strong>{email}</strong>. 
            Enter your password to link Google sign-in.
          </p>
        </div>

        <form className={styles.form} onSubmit={handleSubmit(onSubmit)}>
          <div className={styles.field}>
            <label className={styles.label}>Password</label>
            <input
              type="password"
              className={`${styles.input} ${errors.password ? styles.inputError : ''}`}
              placeholder="••••••••"
              autoFocus
              {...register('password')}
            />
            {errors.password && <span className={styles.errorText}>{errors.password.message}</span>}
          </div>

          <button type="submit" className={styles.submitBtn} disabled={isSubmitting}>
            {isSubmitting ? 'Linking Account...' : 'Link Account'}
          </button>
        </form>
      </div>
    </div>
  );
}
