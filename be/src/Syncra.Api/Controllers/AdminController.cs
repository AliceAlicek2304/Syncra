using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Syncra.Api.Common;
using Syncra.Application.Features.Admin.Queries;
using Syncra.Domain.Entities;
using Syncra.Infrastructure.Persistence;

namespace Syncra.Api.Controllers;

[ApiController]
[Route("api/v1/admin")]
[Authorize(Policy = "AdminOnly")]
public class AdminController : ControllerBase
{
    private readonly IMediator _mediator;
    private readonly AppDbContext _dbContext;

    public AdminController(IMediator mediator, AppDbContext dbContext)
    {
        _mediator = mediator;
        _dbContext = dbContext;
    }

    [HttpGet("access")]
    public IActionResult CheckAccess()
    {
        return Ok(new { allowed = true });
    }

    [HttpGet("overview")]
    public async Task<IActionResult> GetOverview(CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(new GetAdminOverviewQuery(), cancellationToken);
        return result.ToActionResult();
    }

    [HttpGet("users-growth")]
    public async Task<IActionResult> GetUserGrowth(CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(new Syncra.Application.Features.Admin.Queries.UserGrowth.GetUserGrowthQuery(), cancellationToken);
        return result.ToActionResult();
    }

    [HttpGet("posts-analytics")]
    public async Task<IActionResult> GetPostAnalytics(CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(new Syncra.Application.Features.Admin.Queries.PostAnalytics.GetPostAnalyticsQuery(), cancellationToken);
        return result.ToActionResult();
    }

    [HttpGet("revenue-analytics")]
    public async Task<IActionResult> GetRevenueAnalytics(CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(new Syncra.Application.Features.Admin.Queries.RevenueAnalytics.GetRevenueAnalyticsQuery(), cancellationToken);
        return result.ToActionResult();
    }

    [HttpGet("activity-events")]
    public async Task<IActionResult> GetActivityEvents(
        [FromQuery] string? group,
        [FromQuery] string? status,
        [FromQuery] int limit = 50,
        CancellationToken cancellationToken = default)
    {
        var now = DateTime.UtcNow;
        var retentionCutoff = now.AddDays(-7);
        var dayCutoff = now.AddHours(-24);
        var pageSize = Math.Clamp(limit, 10, 200);

        var query = _dbContext.ActivityEvents
            .AsNoTracking()
            .Where(item => item.CreatedAtUtc >= retentionCutoff);

        if (!string.IsNullOrWhiteSpace(group) && !string.Equals(group, "all", StringComparison.OrdinalIgnoreCase))
        {
            var normalizedGroup = group.Trim().ToLowerInvariant();
            query = query.Where(item => item.EventGroup == normalizedGroup);
        }

        if (!string.IsNullOrWhiteSpace(status) && !string.Equals(status, "all", StringComparison.OrdinalIgnoreCase))
        {
            var normalizedStatus = status.Trim().ToLowerInvariant();
            query = query.Where(item => item.Status == normalizedStatus);
        }

        var events = await query
            .OrderByDescending(item => item.CreatedAtUtc)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        var userIds = events
            .Where(item => item.UserId.HasValue)
            .Select(item => item.UserId!.Value)
            .Distinct()
            .ToArray();

        var workspaceIds = events
            .Where(item => item.WorkspaceId.HasValue)
            .Select(item => item.WorkspaceId!.Value)
            .Distinct()
            .ToArray();

        var userEmails = userIds.Length == 0
            ? new Dictionary<Guid, string>()
            : await _dbContext.Users
                .AsNoTracking()
                .Where(user => userIds.Contains(user.Id))
                .ToDictionaryAsync(user => user.Id, user => user.Email.Value, cancellationToken);

        var workspaceNames = workspaceIds.Length == 0
            ? new Dictionary<Guid, string>()
            : await _dbContext.Workspaces
                .AsNoTracking()
                .Where(workspace => workspaceIds.Contains(workspace.Id))
                .ToDictionaryAsync(workspace => workspace.Id, workspace => workspace.Name.Value, cancellationToken);

        var groupCounts = await _dbContext.ActivityEvents
            .AsNoTracking()
            .Where(item => item.CreatedAtUtc >= dayCutoff)
            .GroupBy(item => item.EventGroup)
            .Select(item => new ActivityMetricDto(item.Key, item.Count()))
            .ToListAsync(cancellationToken);

        var statusCounts = await _dbContext.ActivityEvents
            .AsNoTracking()
            .Where(item => item.CreatedAtUtc >= dayCutoff)
            .GroupBy(item => item.Status)
            .Select(item => new ActivityMetricDto(item.Key, item.Count()))
            .ToListAsync(cancellationToken);

        var response = new ActivityEventsResponseDto(
            RetentionDays: 7,
            GeneratedAtUtc: now,
            GroupCounts24h: groupCounts,
            StatusCounts24h: statusCounts,
            Events: events.Select(item => new ActivityEventDto(
                item.Id,
                item.WorkspaceId,
                item.WorkspaceId.HasValue && workspaceNames.TryGetValue(item.WorkspaceId.Value, out var workspaceName) ? workspaceName : null,
                item.UserId,
                item.UserId.HasValue && userEmails.TryGetValue(item.UserId.Value, out var userEmail) ? userEmail : null,
                item.EventType,
                item.EventGroup,
                item.Status,
                item.Title,
                item.Description,
                item.SubjectType,
                item.SubjectId,
                item.Metadata,
                item.CreatedAtUtc)).ToList());

        return Ok(response);
    }

    [HttpGet("vouchers")]
    public async Task<IActionResult> GetVouchers(CancellationToken cancellationToken)
    {
        var vouchers = await _dbContext.BillingVouchers
            .AsNoTracking()
            .OrderByDescending(voucher => voucher.CreatedAtUtc)
            .ToListAsync(cancellationToken);

        if (vouchers.Count == 0)
        {
            return Ok(Array.Empty<AdminVoucherDto>());
        }

        var voucherIds = vouchers.Select(voucher => voucher.Id).ToArray();
        var redemptionCounts = await _dbContext.BillingVoucherRedemptions
            .AsNoTracking()
            .Where(redemption => voucherIds.Contains(redemption.VoucherId) && redemption.Status != "cancelled")
            .GroupBy(redemption => redemption.VoucherId)
            .Select(group => new { VoucherId = group.Key, Count = group.Count() })
            .ToDictionaryAsync(item => item.VoucherId, item => item.Count, cancellationToken);

        var result = vouchers
            .Select(voucher => ToAdminVoucherDto(
                voucher,
                redemptionCounts.TryGetValue(voucher.Id, out var count) ? count : 0))
            .ToList();

        return Ok(result);
    }

    [HttpPost("vouchers")]
    public async Task<IActionResult> CreateVoucher([FromBody] UpsertAdminVoucherRequest? request, CancellationToken cancellationToken)
    {
        if (request == null)
        {
            return BadRequest(new { code = "voucher_payload_required", message = "Voucher payload is required." });
        }

        var validationError = ValidateVoucherRequest(request);
        if (validationError != null)
        {
            return BadRequest(validationError);
        }

        var code = NormalizeVoucherCode(request.Code);
        var exists = await _dbContext.BillingVouchers
            .AnyAsync(voucher => voucher.Code == code, cancellationToken);
        if (exists)
        {
            return Conflict(new { code = "voucher_code_exists", message = "Voucher code already exists." });
        }

        var now = DateTime.UtcNow;
        var voucher = new BillingVoucher
        {
            Code = code,
            Name = request.Name.Trim(),
            Description = NormalizeOptionalText(request.Description),
            DiscountType = NormalizeDiscountType(request.DiscountType),
            PercentOff = request.PercentOff,
            AmountOff = request.AmountOff,
            Currency = "VND",
            MinimumAmount = request.MinimumAmount,
            ApplicablePlanCodesJson = NormalizeJsonList(request.ApplicablePlanCodes),
            ApplicableIntervalsJson = NormalizeJsonList(request.ApplicableIntervals),
            MaxRedemptions = request.MaxRedemptions,
            MaxRedemptionsPerUser = request.MaxRedemptionsPerUser,
            StartsAtUtc = request.StartsAtUtc,
            ExpiresAtUtc = request.ExpiresAtUtc,
            IsActive = request.IsActive,
            RequiresStudentVerification = request.RequiresStudentVerification,
            Source = string.IsNullOrWhiteSpace(request.Source) ? "manual" : request.Source.Trim(),
            CreatedAtUtc = now
        };

        await _dbContext.BillingVouchers.AddAsync(voucher, cancellationToken);
        await _dbContext.SaveChangesAsync(cancellationToken);

        return CreatedAtAction(nameof(GetVouchers), new { id = voucher.Id }, ToAdminVoucherDto(voucher, 0));
    }

    [HttpPut("vouchers/{id:guid}")]
    public async Task<IActionResult> UpdateVoucher(Guid id, [FromBody] UpsertAdminVoucherRequest? request, CancellationToken cancellationToken)
    {
        if (request == null)
        {
            return BadRequest(new { code = "voucher_payload_required", message = "Voucher payload is required." });
        }

        var validationError = ValidateVoucherRequest(request);
        if (validationError != null)
        {
            return BadRequest(validationError);
        }

        var voucher = await _dbContext.BillingVouchers.FirstOrDefaultAsync(item => item.Id == id, cancellationToken);
        if (voucher == null)
        {
            return NotFound(new { code = "voucher_not_found", message = "Voucher not found." });
        }

        var code = NormalizeVoucherCode(request.Code);
        var exists = await _dbContext.BillingVouchers
            .AnyAsync(item => item.Id != id && item.Code == code, cancellationToken);
        if (exists)
        {
            return Conflict(new { code = "voucher_code_exists", message = "Voucher code already exists." });
        }

        voucher.Code = code;
        voucher.Name = request.Name.Trim();
        voucher.Description = NormalizeOptionalText(request.Description);
        voucher.DiscountType = NormalizeDiscountType(request.DiscountType);
        voucher.PercentOff = request.PercentOff;
        voucher.AmountOff = request.AmountOff;
        voucher.Currency = "VND";
        voucher.MinimumAmount = request.MinimumAmount;
        voucher.ApplicablePlanCodesJson = NormalizeJsonList(request.ApplicablePlanCodes);
        voucher.ApplicableIntervalsJson = NormalizeJsonList(request.ApplicableIntervals);
        voucher.MaxRedemptions = request.MaxRedemptions;
        voucher.MaxRedemptionsPerUser = request.MaxRedemptionsPerUser;
        voucher.StartsAtUtc = request.StartsAtUtc;
        voucher.ExpiresAtUtc = request.ExpiresAtUtc;
        voucher.IsActive = request.IsActive;
        voucher.RequiresStudentVerification = request.RequiresStudentVerification;
        voucher.Source = string.IsNullOrWhiteSpace(request.Source) ? "manual" : request.Source.Trim();
        voucher.UpdatedAtUtc = DateTime.UtcNow;

        await _dbContext.SaveChangesAsync(cancellationToken);

        var redemptionCount = await _dbContext.BillingVoucherRedemptions
            .CountAsync(redemption => redemption.VoucherId == voucher.Id && redemption.Status != "cancelled", cancellationToken);
        return Ok(ToAdminVoucherDto(voucher, redemptionCount));
    }

    [HttpPatch("vouchers/{id:guid}/status")]
    public async Task<IActionResult> UpdateVoucherStatus(Guid id, [FromBody] UpdateAdminVoucherStatusRequest? request, CancellationToken cancellationToken)
    {
        if (request == null)
        {
            return BadRequest(new { code = "voucher_payload_required", message = "Voucher payload is required." });
        }

        var voucher = await _dbContext.BillingVouchers.FirstOrDefaultAsync(item => item.Id == id, cancellationToken);
        if (voucher == null)
        {
            return NotFound(new { code = "voucher_not_found", message = "Voucher not found." });
        }

        voucher.IsActive = request.IsActive;
        voucher.UpdatedAtUtc = DateTime.UtcNow;
        await _dbContext.SaveChangesAsync(cancellationToken);

        var redemptionCount = await _dbContext.BillingVoucherRedemptions
            .CountAsync(redemption => redemption.VoucherId == voucher.Id && redemption.Status != "cancelled", cancellationToken);
        return Ok(ToAdminVoucherDto(voucher, redemptionCount));
    }

    [HttpGet("vouchers/{id:guid}/redemptions")]
    public async Task<IActionResult> GetVoucherRedemptions(Guid id, CancellationToken cancellationToken)
    {
        var exists = await _dbContext.BillingVouchers.AnyAsync(voucher => voucher.Id == id, cancellationToken);
        if (!exists)
        {
            return NotFound(new { code = "voucher_not_found", message = "Voucher not found." });
        }

        var redemptions = await _dbContext.BillingVoucherRedemptions
            .AsNoTracking()
            .Where(redemption => redemption.VoucherId == id)
            .OrderByDescending(redemption => redemption.RedeemedAtUtc)
            .Take(50)
            .Select(redemption => new AdminVoucherRedemptionDto(
                redemption.Id,
                redemption.UserId,
                redemption.User.Email.Value,
                redemption.PlanId,
                redemption.Plan.Code,
                redemption.Status,
                redemption.OriginalAmount,
                redemption.DiscountAmount,
                redemption.FinalAmount,
                redemption.Currency,
                redemption.CheckoutSessionId,
                redemption.PaymentProvider,
                redemption.RedeemedAtUtc))
            .ToListAsync(cancellationToken);

        return Ok(redemptions);
    }

    private static object? ValidateVoucherRequest(UpsertAdminVoucherRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Code))
        {
            return new { code = "voucher_code_required", message = "Voucher code is required." };
        }

        if (string.IsNullOrWhiteSpace(request.Name))
        {
            return new { code = "voucher_name_required", message = "Voucher name is required." };
        }

        var discountType = NormalizeDiscountType(request.DiscountType);
        if (discountType == "percent")
        {
            if (!request.PercentOff.HasValue || request.PercentOff <= 0 || request.PercentOff > 100)
            {
                return new { code = "voucher_percent_invalid", message = "Percent discount must be between 0 and 100." };
            }
        }
        else if (discountType == "amount")
        {
            if (!request.AmountOff.HasValue || request.AmountOff <= 0)
            {
                return new { code = "voucher_amount_invalid", message = "Amount discount must be greater than 0." };
            }
        }
        else
        {
            return new { code = "voucher_discount_type_invalid", message = "Discount type must be percent or amount." };
        }

        if (request.MinimumAmount is < 0 ||
            request.MaxRedemptions is < 0 ||
            request.MaxRedemptionsPerUser is < 0)
        {
            return new { code = "voucher_limit_invalid", message = "Voucher limits cannot be negative." };
        }

        if (request.StartsAtUtc.HasValue &&
            request.ExpiresAtUtc.HasValue &&
            request.StartsAtUtc.Value >= request.ExpiresAtUtc.Value)
        {
            return new { code = "voucher_date_range_invalid", message = "Start date must be before expiry date." };
        }

        return null;
    }

    private static string NormalizeVoucherCode(string code)
    {
        return code.Trim().ToUpperInvariant();
    }

    private static string NormalizeDiscountType(string? discountType)
    {
        return string.Equals(discountType, "amount", StringComparison.OrdinalIgnoreCase)
            ? "amount"
            : "percent";
    }

    private static string? NormalizeOptionalText(string? value)
    {
        return string.IsNullOrWhiteSpace(value) ? null : value.Trim();
    }

    private static string? NormalizeJsonList(IReadOnlyCollection<string>? values)
    {
        if (values == null || values.Count == 0)
        {
            return null;
        }

        var normalized = values
            .Where(value => !string.IsNullOrWhiteSpace(value))
            .Select(value => value.Trim().ToUpperInvariant())
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToArray();

        return normalized.Length == 0 ? null : System.Text.Json.JsonSerializer.Serialize(normalized);
    }

    private static AdminVoucherDto ToAdminVoucherDto(BillingVoucher voucher, int redemptionCount)
    {
        return new AdminVoucherDto(
            voucher.Id,
            voucher.Code,
            voucher.Name,
            voucher.Description,
            voucher.DiscountType,
            voucher.PercentOff,
            voucher.AmountOff,
            voucher.Currency,
            voucher.MinimumAmount,
            voucher.ApplicablePlanCodesJson,
            voucher.ApplicableIntervalsJson,
            voucher.MaxRedemptions,
            voucher.MaxRedemptionsPerUser,
            voucher.RedeemedCount,
            voucher.StartsAtUtc,
            voucher.ExpiresAtUtc,
            voucher.IsActive,
            voucher.RequiresStudentVerification,
            voucher.Source,
            voucher.CreatedAtUtc,
            voucher.UpdatedAtUtc,
            redemptionCount);
    }
}

public sealed record AdminVoucherDto(
    Guid Id,
    string Code,
    string Name,
    string? Description,
    string DiscountType,
    decimal? PercentOff,
    decimal? AmountOff,
    string Currency,
    decimal? MinimumAmount,
    string? ApplicablePlanCodesJson,
    string? ApplicableIntervalsJson,
    int? MaxRedemptions,
    int? MaxRedemptionsPerUser,
    int RedeemedCount,
    DateTime? StartsAtUtc,
    DateTime? ExpiresAtUtc,
    bool IsActive,
    bool RequiresStudentVerification,
    string Source,
    DateTime CreatedAtUtc,
    DateTime? UpdatedAtUtc,
    int RedemptionCount);

public sealed record UpsertAdminVoucherRequest(
    string Code,
    string Name,
    string? Description,
    string DiscountType,
    decimal? PercentOff,
    decimal? AmountOff,
    decimal? MinimumAmount,
    IReadOnlyCollection<string>? ApplicablePlanCodes,
    IReadOnlyCollection<string>? ApplicableIntervals,
    int? MaxRedemptions,
    int? MaxRedemptionsPerUser,
    DateTime? StartsAtUtc,
    DateTime? ExpiresAtUtc,
    bool IsActive,
    bool RequiresStudentVerification,
    string? Source);

public sealed record UpdateAdminVoucherStatusRequest(bool IsActive);

public sealed record AdminVoucherRedemptionDto(
    Guid Id,
    Guid UserId,
    string UserEmail,
    Guid PlanId,
    string PlanCode,
    string Status,
    decimal OriginalAmount,
    decimal DiscountAmount,
    decimal FinalAmount,
    string Currency,
    string? CheckoutSessionId,
    string? PaymentProvider,
    DateTime RedeemedAtUtc);
