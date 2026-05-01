import React, { createContext, useContext, useState, useCallback } from 'react';
import { apiFetch } from '../utils/api';
import { 
  CurrentSubscriptionDto, 
  CreateCheckoutSessionByPlanRequest, 
  CreateCheckoutSessionResponse,
  CreatePortalSessionRequest,
  CreatePortalSessionResponse
} from '../types/billing';

interface BillingContextType {
  subscription: CurrentSubscriptionDto | null;
  loading: boolean;
  error: string | null;
  redirecting: boolean;
  loadCurrentSubscription: () => Promise<void>;
  startCheckout: (planCode: string, interval: 'month' | 'year') => Promise<void>;
  openPortal: () => Promise<void>;
}

const BillingContext = createContext<BillingContextType | null>(null);

export function BillingProvider({ children }: { children: React.ReactNode }) {
  const [subscription, setSubscription] = useState<CurrentSubscriptionDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [redirecting, setRedirecting] = useState(false);

  const getWorkspaceId = useCallback(() => {
    return localStorage.getItem('syncra_workspace_id');
  }, []);

  const loadCurrentSubscription = useCallback(async () => {
    const workspaceId = getWorkspaceId();
    if (!workspaceId) {
      setError('Workspace ID not found. Please set syncra_workspace_id in localStorage.');
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
  }, [getWorkspaceId]);

  const startCheckout = useCallback(async (planCode: string, interval: 'month' | 'year') => {
    const workspaceId = getWorkspaceId();
    if (!workspaceId) {
      setError('Workspace ID not found. Please set syncra_workspace_id in localStorage.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const origin = window.location.origin;
      const base = import.meta.env.BASE_URL.replace(/\/$/, '');
      const successUrl = new URL(`${base}/app/settings?billing=success`, origin).toString();
      const cancelUrl = new URL(`${base}/app/settings?billing=cancel`, origin).toString();

      const request: CreateCheckoutSessionByPlanRequest = {
        planCode,
        interval,
        successUrl,
        cancelUrl
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
  }, [getWorkspaceId]);

  const openPortal = useCallback(async () => {
    const workspaceId = getWorkspaceId();
    if (!workspaceId) {
      setError('Workspace ID not found. Please set syncra_workspace_id in localStorage.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const origin = window.location.origin;
      const base = import.meta.env.BASE_URL.replace(/\/$/, '');
      const returnUrl = new URL(`${base}/app/settings?billing=portal_return`, origin).toString();

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
  }, [getWorkspaceId]);

  return (
    <BillingContext.Provider value={{
      subscription,
      loading,
      error,
      redirecting,
      loadCurrentSubscription,
      startCheckout,
      openPortal
    }}>
      {children}
    </BillingContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useBilling() {
  const context = useContext(BillingContext);
  if (!context) {
    throw new Error('useBilling must be used within a BillingProvider');
  }
  return context;
}
