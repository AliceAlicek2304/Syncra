using System.Text.Json;
using Syncra.Application.DTOs.Billing;
using Syncra.Application.DTOs.Payments;
using Syncra.Application.Features.Subscriptions;
using Syncra.Application.Interfaces;
using Syncra.Domain.Entities;
using Syncra.Domain.Exceptions;
using Syncra.Domain.Interfaces;

namespace Syncra.Application.Services;

public sealed class BillingVoucherService : IBillingVoucherService
{
    private const string DiscountTypePercent = "percent";
    private const string DiscountTypeAmount = "amount";

    private readonly IBillingVoucherRepository _voucherRepository;
    private readonly IUserRepository _userRepository;

    public BillingVoucherService(
        IBillingVoucherRepository voucherRepository,
        IUserRepository userRepository)
    {
        _voucherRepository = voucherRepository;
        _userRepository = userRepository;
    }

    public async Task<BillingVoucherPreviewResponse> PreviewAsync(
        Guid userId,
        Plan plan,
        string interval,
        string voucherCode,
        CancellationToken cancellationToken = default)
    {
        var discount = await ResolveDiscountAsync(userId, plan, interval, voucherCode, cancellationToken)
            ?? throw new DomainException("invalid_discount_code", "Mã giảm giá không hợp lệ.");

        var originalAmount = GetPlanAmount(plan, interval);
        var discountAmount = CalculateDiscountAmount(originalAmount, discount.PercentOff, discount.AmountOff);
        var finalAmount = Math.Max(0m, originalAmount - discountAmount);

        return new BillingVoucherPreviewResponse(
            Code: discount.Code,
            Name: discount.Label,
            DiscountType: discount.AmountOff.HasValue ? DiscountTypeAmount : DiscountTypePercent,
            PercentOff: discount.PercentOff,
            AmountOff: discount.AmountOff,
            OriginalAmount: originalAmount,
            DiscountAmount: discountAmount,
            FinalAmount: finalAmount,
            Currency: "VND",
            Message: "Mã giảm giá đã được áp dụng.");
    }

    public async Task<PaymentDiscount?> ResolveDiscountAsync(
        Guid userId,
        Plan plan,
        string interval,
        string? voucherCode,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(voucherCode))
        {
            return null;
        }

        var normalizedCode = voucherCode.Trim().ToUpperInvariant();
        var voucher = await _voucherRepository.GetByCodeAsync(normalizedCode, cancellationToken)
            ?? CreateLegacyStudentVoucher(normalizedCode);

        if (voucher == null)
        {
            throw new DomainException("invalid_discount_code", "Mã giảm giá không hợp lệ.");
        }

        ValidateVoucherShape(voucher);
        ValidateVoucherState(voucher);
        ValidatePlan(voucher, plan.Code);
        ValidateInterval(voucher, interval);

        if (voucher.MinimumAmount.HasValue && GetPlanAmount(plan, interval) < voucher.MinimumAmount.Value)
        {
            throw new DomainException("voucher_minimum_amount_not_met", "Gói này chưa đạt giá trị tối thiểu để áp dụng mã giảm giá.");
        }

        if (voucher.RequiresStudentVerification)
        {
            var user = await _userRepository.GetByIdAsync(userId)
                ?? throw new DomainException("not_found", "User not found.");

            if (user.HasValidStudentVerification != true)
            {
                throw new DomainException("student_verification_required", "Vui lòng xác thực email sinh viên trước khi dùng mã này.");
            }
        }

        if (voucher.Id != Guid.Empty)
        {
            if (voucher.MaxRedemptions.HasValue)
            {
                var redeemedCount = await _voucherRepository.CountRedemptionsAsync(voucher.Id, cancellationToken);
                if (redeemedCount >= voucher.MaxRedemptions.Value)
                {
                    throw new DomainException("voucher_redemption_limit_reached", "Mã giảm giá đã hết lượt sử dụng.");
                }
            }

            if (voucher.MaxRedemptionsPerUser.HasValue)
            {
                var userRedeemedCount = await _voucherRepository.CountRedemptionsForUserAsync(voucher.Id, userId, cancellationToken);
                if (userRedeemedCount >= voucher.MaxRedemptionsPerUser.Value)
                {
                    throw new DomainException("voucher_user_limit_reached", "Bạn đã dùng hết lượt cho mã giảm giá này.");
                }
            }
        }

        var originalAmount = GetPlanAmount(plan, interval);
        var discountAmount = CalculateDiscountAmount(originalAmount, voucher.PercentOff, voucher.AmountOff);

        return new PaymentDiscount(
            Code: voucher.Code,
            Label: voucher.Name,
            PercentOff: voucher.PercentOff,
            Source: voucher.Source,
            AmountOff: voucher.AmountOff,
            DiscountAmount: discountAmount);
    }

    private static BillingVoucher? CreateLegacyStudentVoucher(string normalizedCode)
    {
        if (!string.Equals(normalizedCode, BillingDiscountPolicy.StudentDiscountCode, StringComparison.OrdinalIgnoreCase))
        {
            return null;
        }

        return new BillingVoucher
        {
            Id = Guid.Empty,
            Code = BillingDiscountPolicy.StudentDiscountCode,
            Name = "Ưu đãi sinh viên",
            DiscountType = DiscountTypePercent,
            PercentOff = 50m,
            Currency = "VND",
            ApplicablePlanCodesJson = """["BASIC","MAX"]""",
            IsActive = true,
            RequiresStudentVerification = true,
            Source = "student_verification"
        };
    }

    private static void ValidateVoucherShape(BillingVoucher voucher)
    {
        var type = voucher.DiscountType.Trim().ToLowerInvariant();
        if (type == DiscountTypePercent)
        {
            if (!voucher.PercentOff.HasValue || voucher.PercentOff <= 0m || voucher.PercentOff > 100m)
            {
                throw new DomainException("voucher_invalid_percent", "Mã giảm giá phần trăm chưa được cấu hình đúng.");
            }

            return;
        }

        if (type == DiscountTypeAmount)
        {
            if (!voucher.AmountOff.HasValue || voucher.AmountOff <= 0m)
            {
                throw new DomainException("voucher_invalid_amount", "Mã giảm giá số tiền chưa được cấu hình đúng.");
            }

            return;
        }

        throw new DomainException("voucher_invalid_type", "Loại mã giảm giá không được hỗ trợ.");
    }

    private static void ValidateVoucherState(BillingVoucher voucher)
    {
        var now = DateTime.UtcNow;
        if (!voucher.IsActive)
        {
            throw new DomainException("voucher_inactive", "Mã giảm giá đang bị tắt.");
        }

        if (voucher.StartsAtUtc.HasValue && voucher.StartsAtUtc.Value > now)
        {
            throw new DomainException("voucher_not_started", "Mã giảm giá chưa đến thời gian sử dụng.");
        }

        if (voucher.ExpiresAtUtc.HasValue && voucher.ExpiresAtUtc.Value <= now)
        {
            throw new DomainException("voucher_expired", "Mã giảm giá đã hết hạn.");
        }
    }

    private static void ValidatePlan(BillingVoucher voucher, string planCode)
    {
        var applicablePlanCodes = ParseStringList(voucher.ApplicablePlanCodesJson);
        if (applicablePlanCodes.Count == 0)
        {
            return;
        }

        if (!applicablePlanCodes.Any(code => string.Equals(code, planCode, StringComparison.OrdinalIgnoreCase)))
        {
            throw new DomainException("voucher_plan_not_applicable", "Mã giảm giá không áp dụng cho gói này.");
        }
    }

    private static void ValidateInterval(BillingVoucher voucher, string interval)
    {
        var applicableIntervals = ParseStringList(voucher.ApplicableIntervalsJson);
        if (applicableIntervals.Count == 0)
        {
            return;
        }

        if (!applicableIntervals.Any(item => string.Equals(item, interval, StringComparison.OrdinalIgnoreCase)))
        {
            throw new DomainException("voucher_interval_not_applicable", "Mã giảm giá không áp dụng cho chu kỳ thanh toán này.");
        }
    }

    private static decimal GetPlanAmount(Plan plan, string interval)
    {
        return string.Equals(interval, "year", StringComparison.OrdinalIgnoreCase)
            ? plan.PriceYearly
            : plan.PriceMonthly;
    }

    private static decimal CalculateDiscountAmount(decimal originalAmount, decimal? percentOff, decimal? amountOff)
    {
        var discountAmount = amountOff ?? decimal.Round(originalAmount * (percentOff ?? 0m) / 100m, 0, MidpointRounding.AwayFromZero);
        return Math.Min(originalAmount, Math.Max(0m, discountAmount));
    }

    private static IReadOnlyList<string> ParseStringList(string? json)
    {
        if (string.IsNullOrWhiteSpace(json))
        {
            return Array.Empty<string>();
        }

        try
        {
            return JsonSerializer.Deserialize<List<string>>(json) ?? [];
        }
        catch (JsonException)
        {
            throw new DomainException("voucher_invalid_configuration", "Cấu hình mã giảm giá không hợp lệ.");
        }
    }
}
