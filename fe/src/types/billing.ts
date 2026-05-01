export type CurrentSubscriptionDto = {
  status: string;
  planCode?: string | null;
  planName?: string | null;
  startedAtUtc?: string | null;
  endsAtUtc?: string | null;
  trialEndsAtUtc?: string | null;
  canceledAtUtc?: string | null;
  provider?: string | null;
  providerCustomerId?: string | null;
  providerSubscriptionId?: string | null;
  isDefault: boolean;
};

export type CreateCheckoutSessionByPlanRequest = {
  planCode: string;
  interval?: 'month' | 'year' | string;
  successUrl?: string;
  cancelUrl?: string;
};

export type CreateCheckoutSessionResponse = {
  checkoutUrl: string;
  sessionId: string;
  customerId?: string | null;
  clientReferenceId?: string | null;
};

export type CreatePortalSessionRequest = {
  returnUrl?: string;
};

export type CreatePortalSessionResponse = {
  portalUrl: string;
};
