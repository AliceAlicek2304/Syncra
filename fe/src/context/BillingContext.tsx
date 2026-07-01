import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { apiFetch } from '../utils/api';
import { useWorkspace } from './WorkspaceContext';
import type{ 
  CurrentSubscriptionDto, 
  CreateCheckoutSessionByPlanRequest, 
  CreateCheckoutSessionResponse,
  CreatePortalSessionRequest,
  CreatePortalSessionResponse,
  StudentVerificationStatusDto,
  RequestStudentVerificationResponse,
  VerifyStudentEmailResponse
} from '../types/billing';

interface BillingContextType {
  subscription: CurrentSubscriptionDto | null;
  loading: boolean;
  error: string | null;
  redirecting: boolean;
  studentStatus: StudentVerificationStatusDto | null;
  loadCurrentSubscription: () => Promise<void>;
  loadStudentVerificationStatus: () => Promise<void>;
  requestStudentVerificationCode: (studentEmail: string) => Promise<RequestStudentVerificationResponse>;
  verifyStudentEmailCode: (studentEmail: string, code: string) => Promise<VerifyStudentEmailResponse>;
  startCheckout: (planCode: string, interval: 'month' | 'year', skipTrial?: boolean, discountCode?: string | null) => Promise<void>;
  openPortal: () => Promise<void>;
}

const BillingContext = createContext<BillingContextType | null>(null);

export function BillingProvider({ children }: { children: React.ReactNode }) {
  const [subscription, setSubscription] = useState<CurrentSubscriptionDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [redirecting, setRedirecting] = useState(false);
  const [studentStatus, setStudentStatus] = useState<StudentVerificationStatusDto | null>(null);

  const { activeWorkspace } = useWorkspace();
  const workspaceId = activeWorkspace?.id;

  // ponytail: clear redirecting when page restored from bfcache (back button)
  useEffect(() => {
    const handlePageShow = (e: PageTransitionEvent) => {
      if (e.persisted) setRedirecting(false);
    };
    window.addEventListener('pageshow', handlePageShow);
    return () => window.removeEventListener('pageshow', handlePageShow);
  }, []);

  const loadCurrentSubscription = useCallback(async () => {
    if (!workspaceId) {
      setError('Workspace ID not found.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<CurrentSubscriptionDto>(
        `/api/v1/workspaces/${workspaceId}/subscription`,
        { workspaceId }
      );
      setSubscription(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load subscription');
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  const startCheckout = useCallback(async (planCode: string, interval: 'month' | 'year', skipTrial: boolean = false, discountCode?: string | null) => {
    if (!workspaceId) {
      setError('Workspace ID not found.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const origin = window.location.origin;
      const base = import.meta.env.BASE_URL.replace(/\/$/, '');
      const successUrl = new URL(`${base}/app/connections?billing=success`, origin).toString();
      const cancelUrl = new URL(`${base}/app/connections?billing=cancel`, origin).toString();

      const request: CreateCheckoutSessionByPlanRequest = {
        planCode,
        interval,
        successUrl,
        cancelUrl,
        discountCode,
        skipTrial
      };

      const response = await apiFetch<CreateCheckoutSessionResponse>(
        `/api/v2/workspaces/${workspaceId}/subscription/create-checkout-session`,
        {
          method: 'POST',
          body: JSON.stringify(request),
          workspaceId
        }
      );

      setRedirecting(true);
      window.location.assign(response.checkoutUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start checkout');
      setLoading(false);
    }
  }, [workspaceId]);

  const loadStudentVerificationStatus = useCallback(async () => {
    setError(null);
    try {
      const data = await apiFetch<StudentVerificationStatusDto>('/api/v1/student-verification/status');
      setStudentStatus(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load student verification status');
    }
  }, []);

  const requestStudentVerificationCode = useCallback(async (studentEmail: string) => {
    setError(null);
    const response = await apiFetch<RequestStudentVerificationResponse>(
      '/api/v1/student-verification/request-code',
      {
        method: 'POST',
        body: JSON.stringify({ studentEmail })
      }
    );
    if (response.isVerified && response.studentEmail && response.verifiedAtUtc) {
      setStudentStatus({
        studentEmail: response.studentEmail,
        verifiedAtUtc: response.verifiedAtUtc,
        expiresAtUtc: response.expiresAtUtc,
        isVerified: true,
        isExpired: false
      });
    }
    return response;
  }, []);

  const verifyStudentEmailCode = useCallback(async (studentEmail: string, code: string) => {
    setError(null);
    const response = await apiFetch<VerifyStudentEmailResponse>(
      '/api/v1/student-verification/verify-code',
      {
        method: 'POST',
        body: JSON.stringify({ studentEmail, code })
      }
    );
    setStudentStatus({
      studentEmail: response.studentEmail,
      verifiedAtUtc: response.verifiedAtUtc,
      expiresAtUtc: response.expiresAtUtc,
      isVerified: response.isVerified,
      isExpired: false
    });
    return response;
  }, []);

  const openPortal = useCallback(async () => {
    if (!workspaceId) {
      setError('Workspace ID not found.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const origin = window.location.origin;
      const base = import.meta.env.BASE_URL.replace(/\/$/, '');
      const returnUrl = new URL(`${base}/app/connections?billing=portal_return`, origin).toString();

      const request: CreatePortalSessionRequest = {
        returnUrl
      };

      const response = await apiFetch<CreatePortalSessionResponse>(
        `/api/v1/workspaces/${workspaceId}/subscription/create-portal-session`,
        {
          method: 'POST',
          body: JSON.stringify(request),
          workspaceId
        }
      );

      setRedirecting(true);
      window.location.assign(response.portalUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to open billing portal');
      setLoading(false);
    }
  }, [workspaceId]);

  return (
    <BillingContext.Provider value={{
      subscription,
      loading,
      error,
      redirecting,
      studentStatus,
      loadCurrentSubscription,
      loadStudentVerificationStatus,
      requestStudentVerificationCode,
      verifyStudentEmailCode,
      startCheckout,
      openPortal
    }}>
      {children}
    </BillingContext.Provider>
  );
}

export function useBilling() {
  const context = useContext(BillingContext);
  if (!context) {
    throw new Error('useBilling must be used within a BillingProvider');
  }
  return context;
}
