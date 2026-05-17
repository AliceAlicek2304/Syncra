import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import LoginModal from './LoginModal';
import React from 'react';
import { BrowserRouter } from 'react-router-dom';

vi.mock('../../context/AuthContext', () => ({
  useAuth: vi.fn(() => ({ login: vi.fn() })),
}));

vi.mock('../../context/ToastContext', () => ({
  useToast: vi.fn(() => ({ error: vi.fn() })),
}));

vi.mock('../../api/auth', () => ({
  authApi: {
    getOAuthLoginUrl: vi.fn(() => Promise.resolve({ loginUrl: 'https://accounts.google.com/o/oauth2/auth...' })),
  },
}));

const originalLocation = window.location;

function renderModal() {
  const onClose = vi.fn();
  const onSuccess = vi.fn();
  const result = render(
    <BrowserRouter>
      <LoginModal onClose={onClose} onSuccess={onSuccess} />
    </BrowserRouter>
  );
  return { onClose, onSuccess, ...result };
}

describe('LoginModal Accessibility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, 'location', {
      value: { href: '' },
      writable: true,
    });
  });

  afterEach(() => {
    Object.defineProperty(window, 'location', {
      value: originalLocation,
      writable: true,
    });
  });

  it('should render the modal with role="dialog" and aria-modal="true"', () => {
    renderModal();
    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAttribute('aria-modal', 'true');
  });

  it('should have aria-label on the close button', () => {
    renderModal();
    const closeBtn = screen.getByLabelText('Close modal');
    expect(closeBtn).toBeInTheDocument();
  });

  it('should have aria-label on the Google sign-in button', () => {
    renderModal();
    const googleBtn = screen.getByLabelText('Sign in with Google');
    expect(googleBtn).toBeInTheDocument();
  });

  it('should have aria-required on email and password inputs', () => {
    renderModal();
    const emailInput = screen.getByTestId('login-email');
    const passwordInput = screen.getByTestId('login-password');
    expect(emailInput).toHaveAttribute('aria-required', 'true');
    expect(passwordInput).toHaveAttribute('aria-required', 'true');
  });

  it('should close on Escape key press', () => {
    const { onClose } = renderModal();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('should call onClose when backdrop is clicked', () => {
    const { onClose } = renderModal();
    const backdrop = screen.getByRole('dialog').parentElement;
    if (backdrop) {
      fireEvent.click(backdrop);
      expect(onClose).toHaveBeenCalledTimes(1);
    }
  });

  it('should not close when modal content is clicked', () => {
    const { onClose } = renderModal();
    const dialog = screen.getByRole('dialog');
    fireEvent.click(dialog);
    expect(onClose).not.toHaveBeenCalled();
  });
});
