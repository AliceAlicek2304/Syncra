using System;
using System.Collections.Generic;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Syncra.Application.DTOs.Payments;
using Syncra.Application.Interfaces;
using Syncra.Application.Options;
using Syncra.Domain.Exceptions;
using Syncra.Domain.Interfaces;
using Syncra.Domain.Entities;
using Syncra.Domain.Enums;

namespace Syncra.Infrastructure.Services;

public sealed class SePayPaymentProvider : IPaymentProvider
{
    public string ProviderKey => "sepay";

    private readonly SePayOptions _sePayOptions;
    private readonly IWorkspaceRepository _workspaceRepository;
    private readonly ISubscriptionRepository _subscriptionRepository;
    private readonly IPlanRepository _planRepository;
    private readonly IDistributedCache _cache;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IActivityEventService _activityEventService;
    private readonly ILogger<SePayPaymentProvider> _logger;

    public SePayPaymentProvider(
        IOptions<SePayOptions> sePayOptions,
        IWorkspaceRepository workspaceRepository,
        ISubscriptionRepository subscriptionRepository,
        IPlanRepository planRepository,
        IDistributedCache cache,
        IUnitOfWork unitOfWork,
        IActivityEventService activityEventService,
        ILogger<SePayPaymentProvider> logger)
    {
        _sePayOptions = sePayOptions.Value;
        _workspaceRepository = workspaceRepository;
        _subscriptionRepository = subscriptionRepository;
        _planRepository = planRepository;
        _cache = cache;
        _unitOfWork = unitOfWork;
        _activityEventService = activityEventService;
        _logger = logger;
    }

    public async Task<PaymentCheckoutSessionResult> CreateCheckoutSessionAsync(
        PaymentCheckoutSessionRequest request,
        CancellationToken cancellationToken = default)
    {
        // 1. Resolve Plan and Price details
        if (!Guid.TryParse(request.PriceId, out var planId))
        {
            throw new DomainException("invalid_plan", "Invalid plan identifier for SePay.");
        }

        var plan = await _planRepository.GetByIdAsync(planId);
        if (plan == null)
        {
            throw new DomainException("not_found", $"Plan with ID '{planId}' was not found.");
        }

        // 2. Paid checkout only
        if (string.Equals(plan.Code, "FREE", StringComparison.OrdinalIgnoreCase))
        {
            throw new DomainException("invalid_plan", "Free plan does not require a paid checkout.");
        }

        // 3. Paid upgrade flow: Generate custom checkout payment page
        var isYearly = string.Equals(request.Interval, "year", StringComparison.OrdinalIgnoreCase);
        var paymentCode = GeneratePaymentCode();
        var originalAmount = isYearly ? plan.PriceYearly : plan.PriceMonthly;
        var amount = ApplyDiscount(originalAmount, request.Discount);

        var pendingPayment = new SePayPendingCheckoutDto(
            WorkspaceId: request.WorkspaceId,
            PlanId: plan.Id,
            UserId: request.UserId,
            Amount: amount,
            Interval: isYearly ? "year" : "month",
            OriginalAmount: originalAmount,
            DiscountCode: request.Discount?.Code,
            DiscountPercentOff: request.Discount?.PercentOff,
            DiscountAmount: request.Discount?.DiscountAmount
        );

        var cacheKey = $"sepay_pending:{paymentCode}";
        var cacheOptions = new DistributedCacheEntryOptions
        {
            AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(20)
        };

        var cacheValue = JsonSerializer.Serialize(pendingPayment);
        await _cache.SetStringAsync(cacheKey, cacheValue, cacheOptions, cancellationToken);

        _logger.LogInformation("Generated SePay pending payment {PaymentCode} of {Amount} VND for workspace {WorkspaceId}",
            paymentCode, amount, request.WorkspaceId);

        await _activityEventService.RecordAsync(new ActivityEventRequest(
            EventType: "billing.checkout_created",
            EventGroup: "billing",
            Status: "info",
            Title: "Checkout created",
            Description: $"{plan.Code} {(isYearly ? "year" : "month")} - {amount:N0} VND",
            WorkspaceId: request.WorkspaceId,
            UserId: request.UserId,
            SubjectType: "Checkout",
            SubjectId: paymentCode,
            Metadata: new Dictionary<string, string?>
            {
                ["paymentCode"] = paymentCode,
                ["planCode"] = plan.Code,
                ["interval"] = isYearly ? "year" : "month",
                ["amount"] = amount.ToString("0"),
                ["discountCode"] = request.Discount?.Code
            }), cancellationToken);

        var uri = new Uri(request.SuccessUrl);
        var origin = uri.GetLeftPart(UriPartial.Authority);
        var discountQuery = request.Discount == null
            ? string.Empty
            : $"&originalAmount={originalAmount}&discountCode={Uri.EscapeDataString(request.Discount.Code)}&discountPercent={request.Discount.PercentOff}&discountAmount={request.Discount.DiscountAmount}";
        var checkoutUrl = $"{origin}/app/sepay-checkout?code={paymentCode}&amount={amount}&plan={plan.Code}&interval={(isYearly ? "year" : "month")}{discountQuery}&accountNumber={_sePayOptions.AccountNumber}&bankCode={_sePayOptions.BankCode}&accountName={Uri.EscapeDataString(_sePayOptions.AccountName)}";

        return new PaymentCheckoutSessionResult(
            SessionId: paymentCode,
            CheckoutUrl: checkoutUrl,
            ProviderCustomerId: request.ProviderCustomerId ?? "sepay_customer",
            ClientReferenceId: request.WorkspaceId.ToString());
    }

    public Task<PaymentPortalSessionResult> CreatePortalSessionAsync(
        PaymentPortalSessionRequest request,
        CancellationToken cancellationToken = default)
    {
        // SePay uses direct bank transfer, customer portal is just our settings billing page
        return Task.FromResult(new PaymentPortalSessionResult($"{request.ReturnUrl.Split('?')[0]}"));
    }

    public async Task<PaymentWebhookParseResult> ParseWebhookAsync(
        PaymentWebhookRequest request,
        CancellationToken cancellationToken = default)
    {
        try
        {
            // 1. Verify HMAC Signature
            if (!request.Headers.TryGetValue("X-SePay-Signature", out var signatureHeader) || string.IsNullOrWhiteSpace(signatureHeader))
            {
                return new PaymentWebhookParseResult(false, "Missing X-SePay-Signature header", null);
            }

            if (!request.Headers.TryGetValue("X-SePay-Timestamp", out var timestampHeader) || string.IsNullOrWhiteSpace(timestampHeader))
            {
                return new PaymentWebhookParseResult(false, "Missing X-SePay-Timestamp header", null);
            }

            // Verify replay attack (allow max 10 minutes drift)
            if (long.TryParse(timestampHeader, out var timestamp))
            {
                var nowUnix = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
                if (Math.Abs(nowUnix - timestamp) > 600)
                {
                    return new PaymentWebhookParseResult(false, "Stale webhook request (replay attack prevention)", null);
                }
            }

            var verified = VerifyHmacSignature(request.Payload, signatureHeader, timestampHeader, _sePayOptions.WebhookSecret);
            if (!verified)
            {
                _logger.LogWarning("Invalid SePay webhook signature.");
                return new PaymentWebhookParseResult(false, "Invalid webhook signature", null);
            }

            // 2. Parse Webhook Event Body
            using var doc = JsonDocument.Parse(request.Payload);
            var root = doc.RootElement;

            var transactionId = root.GetProperty("id").GetInt64().ToString();
            var paymentCode = ResolvePaymentCode(root);
            var amount = root.GetProperty("transferAmount").GetDecimal();
            var transferType = root.GetProperty("transferType").GetString() ?? "in";

            if (transferType != "in")
            {
                return new PaymentWebhookParseResult(false, "Ignored non-incoming transaction", null);
            }

            if (string.IsNullOrWhiteSpace(paymentCode))
            {
                return new PaymentWebhookParseResult(false, "Missing payment transaction code", null);
            }

            // 3. Resolve from Cache
            var cacheKey = $"sepay_pending:{paymentCode}";
            var cachedString = await _cache.GetStringAsync(cacheKey, cancellationToken);
            if (string.IsNullOrWhiteSpace(cachedString))
            {
                _logger.LogWarning("SePay payment code {PaymentCode} not found in pending cache or expired", paymentCode);
                return new PaymentWebhookParseResult(false, "Payment code expired or invalid", null);
            }

            var pending = JsonSerializer.Deserialize<SePayPendingCheckoutDto>(cachedString);
            if (pending == null)
            {
                return new PaymentWebhookParseResult(false, "Invalid cache data", null);
            }

            if (decimal.Round(amount, 0) != decimal.Round(pending.Amount, 0))
            {
                _logger.LogWarning(
                    "SePay payment code {PaymentCode} amount mismatch. Expected {ExpectedAmount}, got {ActualAmount}",
                    paymentCode,
                    pending.Amount,
                    amount);
                return new PaymentWebhookParseResult(false, "Payment amount does not match pending checkout", null);
            }

            // Clean up cache on success
            await _cache.RemoveAsync(cacheKey, cancellationToken);

            // 4. Map to PaymentWebhookEvent
            var webhookEvent = new PaymentWebhookEvent
            {
                Provider = ProviderKey,
                EventId = transactionId,
                EventType = "sepay.payment.succeeded",
                WorkspaceId = pending.WorkspaceId,
                ProviderCustomerId = root.GetProperty("accountNumber").GetString(),
                ProviderSubscriptionId = paymentCode,
                EventCreatedAtUtc = DateTime.UtcNow,
                Metadata = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
                {
                    { "PlanId", pending.PlanId.ToString() },
                    { "Interval", pending.Interval },
                    { "Amount", amount.ToString() },
                    { "OriginalAmount", pending.OriginalAmount.ToString() },
                    { "DiscountCode", pending.DiscountCode ?? string.Empty },
                    { "DiscountPercentOff", pending.DiscountPercentOff?.ToString() ?? string.Empty },
                    { "DiscountAmount", pending.DiscountAmount?.ToString() ?? string.Empty },
                    { "UserId", pending.UserId?.ToString() ?? string.Empty }
                }
            };

            return new PaymentWebhookParseResult(true, null, webhookEvent);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error parsing SePay webhook payload");
            return new PaymentWebhookParseResult(false, ex.Message, null);
        }
    }

    private static bool VerifyHmacSignature(string payload, string signatureHeader, string timestampHeader, string secret)
    {
        var cleanSignature = signatureHeader.Replace("sha256=", "").Trim();
        var message = $"{timestampHeader}.{payload}";
        var secretBytes = Encoding.UTF8.GetBytes(secret);
        var messageBytes = Encoding.UTF8.GetBytes(message);

        using var hmac = new HMACSHA256(secretBytes);
        var hashBytes = hmac.ComputeHash(messageBytes);
        var calculatedSignature = Convert.ToHexString(hashBytes).ToLowerInvariant();

        return string.Equals(cleanSignature, calculatedSignature, StringComparison.OrdinalIgnoreCase);
    }

    private static string ResolvePaymentCode(JsonElement root)
    {
        var explicitCode = GetString(root, "code")?.Trim().ToUpperInvariant();
        if (!string.IsNullOrWhiteSpace(explicitCode))
        {
            return explicitCode;
        }

        var searchableText = $"{GetString(root, "content")} {GetString(root, "description")}".ToUpperInvariant();
        var match = System.Text.RegularExpressions.Regex.Match(searchableText, @"\bSR[A-Z0-9]{6,8}\b");
        return match.Success ? match.Value : string.Empty;
    }

    private static string? GetString(JsonElement root, string propertyName)
    {
        return root.TryGetProperty(propertyName, out var property) && property.ValueKind == JsonValueKind.String
            ? property.GetString()
            : null;
    }

    private static string GeneratePaymentCode()
    {
        var random = new Random();
        const string chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        var result = new StringBuilder(6);
        for (int i = 0; i < 6; i++)
        {
            result.Append(chars[random.Next(chars.Length)]);
        }
        return $"SR{result}";
    }

    private static decimal ApplyDiscount(decimal amount, PaymentDiscount? discount)
    {
        if (discount == null)
        {
            return amount;
        }

        var discountAmount = discount.AmountOff
            ?? decimal.Round(amount * (discount.PercentOff ?? 0m) / 100m, 0, MidpointRounding.AwayFromZero);
        return Math.Max(0m, amount - Math.Min(amount, Math.Max(0m, discountAmount)));
    }
}

public record SePayPendingCheckoutDto(
    Guid WorkspaceId,
    Guid PlanId,
    Guid? UserId,
    decimal Amount,
    string Interval,
    decimal OriginalAmount,
    string? DiscountCode,
    decimal? DiscountPercentOff,
    decimal? DiscountAmount
);
