namespace Syncra.Application.DTOs.Billing;

public sealed record PreviewBillingVoucherRequest(
    string PlanCode,
    string? Interval,
    string VoucherCode);

public sealed record BillingVoucherPreviewResponse(
    string Code,
    string Name,
    string DiscountType,
    decimal? PercentOff,
    decimal? AmountOff,
    decimal OriginalAmount,
    decimal DiscountAmount,
    decimal FinalAmount,
    string Currency,
    string Message);
