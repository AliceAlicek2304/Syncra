import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useSearchParams, Link } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import { authApi } from '../api/auth';

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
      <div className="min-h-screen bg-brand-canvas-soft flex items-center justify-center p-6 text-brand-ink">
        <div className="bg-brand-canvas border border-brand-border p-8 rounded-brand-md shadow-sm w-full max-w-md flex flex-col gap-6 text-center">
          <div>
            <h2 className="text-2xl font-black text-brand-ink tracking-tight mb-2">Invalid or expired link</h2>
            <p className="text-sm text-brand-body leading-relaxed">
              This password reset link is invalid or has expired. Please request a new one.
            </p>
          </div>
          <Link to="/forgot-password" className="w-full py-3 bg-brand-primary hover:bg-brand-primary-hover text-brand-on-primary font-bold rounded-brand-md text-sm transition-all shadow-sm text-center block focus:outline-none">
            Request new reset link
          </Link>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-brand-canvas-soft flex items-center justify-center p-6 text-brand-ink">
        <div className="bg-brand-canvas border border-brand-border p-8 rounded-brand-md shadow-sm w-full max-w-md flex flex-col gap-6 text-center">
          <div>
            <h2 className="text-2xl font-black text-brand-ink tracking-tight mb-2">Password reset successful</h2>
            <p className="text-sm text-brand-body leading-relaxed">
              Your password has been reset successfully. You can now sign in with your new password.
            </p>
          </div>
          <Link to="/login" className="w-full py-3 bg-brand-primary hover:bg-brand-primary-hover text-brand-on-primary font-bold rounded-brand-md text-sm transition-all shadow-sm text-center block focus:outline-none">
            Sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-canvas-soft flex items-center justify-center p-6 text-brand-ink">
      <div className="bg-brand-canvas border border-brand-border p-8 rounded-brand-md shadow-sm w-full max-w-md flex flex-col gap-6">
        <div className="text-center">
          <h2 className="text-2xl font-black text-brand-ink tracking-tight mb-1">Reset your password</h2>
          <p className="text-sm text-brand-body">
            Enter your new password below.
          </p>
        </div>

        <form className="flex flex-col gap-5" onSubmit={handleSubmit(onSubmit)}>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-brand-ink uppercase tracking-wider">New password</label>
            <input
              type="password"
              aria-required="true"
              className={`bg-brand-canvas border rounded-brand-sm p-3 text-sm focus:border-brand-primary focus:ring-1 focus:ring-brand-primary outline-none transition-all placeholder:text-brand-mute ${
                errors.newPassword ? 'border-red-500 focus:border-red-500' : 'border-brand-ink'
              }`}
              placeholder="At least 8 characters"
              {...register('newPassword')}
            />
            {errors.newPassword && <span className="text-xs text-red-600 font-medium">{errors.newPassword.message}</span>}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-brand-ink uppercase tracking-wider">Confirm password</label>
            <input
              type="password"
              aria-required="true"
              className={`bg-brand-canvas border rounded-brand-sm p-3 text-sm focus:border-brand-primary focus:ring-1 focus:ring-brand-primary outline-none transition-all placeholder:text-brand-mute ${
                errors.confirmPassword ? 'border-red-500 focus:border-red-500' : 'border-brand-ink'
              }`}
              placeholder="Re-enter your new password"
              {...register('confirmPassword')}
            />
            {errors.confirmPassword && <span className="text-xs text-red-600 font-medium">{errors.confirmPassword.message}</span>}
          </div>

          <button type="submit" className="w-full py-3 bg-brand-primary hover:bg-brand-primary-hover text-brand-on-primary font-bold rounded-brand-md text-sm transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none" disabled={isSubmitting}>
            {isSubmitting ? 'Resetting...' : 'Reset password'}
          </button>
        </form>
      </div>
    </div>
  );
}
