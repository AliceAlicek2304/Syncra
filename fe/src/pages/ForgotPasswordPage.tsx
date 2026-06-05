import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, Link } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import { authApi } from '../api/auth';

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
      <div className="min-h-screen bg-brand-canvas-soft flex items-center justify-center p-6 text-brand-ink">
        <div className="bg-brand-canvas border border-brand-border p-8 rounded-brand-md shadow-sm w-full max-w-md flex flex-col gap-6 text-center">
          <div>
            <h2 className="text-2xl font-black text-brand-ink tracking-tight mb-2">Check your email</h2>
            <p className="text-sm text-brand-body leading-relaxed">
              If an account with that email exists, a password reset link has been sent.
            </p>
          </div>
          <button
            onClick={() => navigate('/login')}
            className="w-full py-3 bg-brand-primary hover:bg-brand-primary-hover text-brand-on-primary font-bold rounded-brand-md text-sm transition-all shadow-sm focus:outline-none"
          >
            Back to sign in
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-canvas-soft flex items-center justify-center p-6 text-brand-ink">
      <div className="bg-brand-canvas border border-brand-border p-8 rounded-brand-md shadow-sm w-full max-w-md flex flex-col gap-6">
        <div className="text-center">
          <h2 className="text-2xl font-black text-brand-ink tracking-tight mb-1">Forgot password?</h2>
          <p className="text-sm text-brand-body">
            Enter your email and we'll send you a reset link.
          </p>
        </div>

        <form className="flex flex-col gap-5" onSubmit={handleSubmit(onSubmit)}>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-brand-ink uppercase tracking-wider">Email</label>
            <input
              type="email"
              aria-required="true"
              className={`bg-brand-canvas border rounded-brand-sm p-3 text-sm focus:border-brand-primary focus:ring-1 focus:ring-brand-primary outline-none transition-all placeholder:text-brand-mute ${
                errors.email ? 'border-red-500 focus:border-red-500' : 'border-brand-ink'
              }`}
              placeholder="name@example.com"
              {...register('email')}
            />
            {errors.email && <span className="text-xs text-red-600 font-medium">{errors.email.message}</span>}
          </div>

          <button type="submit" className="w-full py-3 bg-brand-primary hover:bg-brand-primary-hover text-brand-on-primary font-bold rounded-brand-md text-sm transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none" disabled={isSubmitting}>
            {isSubmitting ? 'Sending...' : 'Send reset link'}
          </button>
        </form>

        <div className="text-center text-sm text-brand-body mt-2">
          Remember your password?
          <Link to="/login" className="text-brand-primary font-semibold hover:underline font-sans text-sm ml-1.5 focus:outline-none">Sign in</Link>
        </div>
      </div>
    </div>
  );
}
