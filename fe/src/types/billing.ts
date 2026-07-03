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
  discountCode?: string | null;
  skipTrial?: boolean;
};

export type CreateCheckoutSessionResponse = {
  checkoutUrl: string;
  sessionId: string;
  customerId?: string | null;
  clientReferenceId?: string | null;
};

export type PreviewBillingVoucherRequest = {
  planCode: string;
  interval?: 'month' | 'year' | string;
  voucherCode: string;
};

export type BillingVoucherPreviewResponse = {
  code: string;
  name: string;
  discountType: string;
  percentOff?: number | null;
  amountOff?: number | null;
  originalAmount: number;
  discountAmount: number;
  finalAmount: number;
  currency: string;
  message: string;
};

export type CreatePortalSessionRequest = {
  returnUrl?: string;
};

export type CreatePortalSessionResponse = {
  portalUrl: string;
};

export type StudentVerificationStatusDto = {
  studentEmail?: string | null;
  verifiedAtUtc?: string | null;
  expiresAtUtc?: string | null;
  isVerified: boolean;
  isExpired: boolean;
};

export type RequestStudentVerificationResponse = {
  message: string;
  expiresAtUtc: string;
  studentEmail?: string | null;
  verifiedAtUtc?: string | null;
  isVerified?: boolean;
};

export type VerifyStudentEmailResponse = {
  studentEmail: string;
  verifiedAtUtc: string;
  expiresAtUtc: string;
  isVerified: boolean;
};
