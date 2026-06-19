import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { Lock } from 'lucide-react';
import { authApi } from '../../api/auth';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import styles from './ChangePasswordForm.module.css';

// ChangePasswordForm handles both password-set and OAuth-only users.
// Uses react-hook-form + zod for validation. New password must be at least 8 characters.
const changePasswordSchema = z.object({
  currentPassword: z.string().optional(),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
});

type ChangePasswordFormData = z.infer<typeof changePasswordSchema>;

export default function ChangePasswordForm() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { success: showSuccess, error: showError } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ChangePasswordFormData>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
    },
  });

  const onSubmit = async (data: ChangePasswordFormData) => {
    setIsSubmitting(true);
    try {
      await authApi.changePassword({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
      
      showSuccess('Password changed successfully. Please log in with your new password.');
      reset();
      
      // Logout and redirect to login after a short delay
      setTimeout(() => {
        logout();
        navigate('/login');
      }, 1500);
    } catch (error) {
      console.error('Failed to change password:', error);
      const message = (error as { response?: { data?: { message?: string } } })?.response?.data?.message 
        || 'Failed to change password. Please try again.';
      showError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show message if user is loading or no user
  if (!user) {
    return null;
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
      <div className={styles.formContainer}>
        {/* Current Password - Only show if user has password set */}
        {user.hasPasswordBeenSet && (
          <div className={styles.field}>
            <label htmlFor="currentPassword" className={styles.label}>
              <Lock size={16} /> Current Password
            </label>
            <input
              id="currentPassword"
              type="password"
              placeholder="Enter your current password"
              {...register('currentPassword')}
              className={`${styles.input} ${errors.currentPassword ? styles.inputError : ''}`}
              disabled={isSubmitting}
            />
            {errors.currentPassword && (
              <p className={styles.error}>{errors.currentPassword.message}</p>
            )}
          </div>
        )}

        {/* New Password */}
        <div className={styles.field}>
          <label htmlFor="newPassword" className={styles.label}>
            <Lock size={16} /> New Password
          </label>
          <input
            id="newPassword"
            type="password"
            placeholder="Enter new password (min 8 characters)"
            {...register('newPassword')}
            className={`${styles.input} ${errors.newPassword ? styles.inputError : ''}`}
            disabled={isSubmitting}
          />
          {errors.newPassword && (
            <p className={styles.error}>{errors.newPassword.message}</p>
          )}
          <p className={styles.hint}>Password must be at least 8 characters long</p>
        </div>

        {/* Submit Button */}
        <motion.button
          type="submit"
          whileTap={{ scale: 0.97 }}
          transition={{ duration: 0.1 }}
          className={styles.submitBtn}
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Updating Password...' : 'Change Password'}
        </motion.button>
      </div>
    </form>
  );
}
