using System.Security.Claims;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.EntityFrameworkCore;
using Syncra.Application.Options;
using Syncra.Domain.Entities;
using Syncra.Infrastructure.Persistence;

using Syncra.Domain.Enums;

namespace Syncra.Api.Filters;

public sealed class RepurposePlanLimitFilter : IAsyncActionFilter
{
    private const string UsageMetricCode = "repurpose_generations";

    private readonly AppDbContext _db;
    private readonly ILogger<RepurposePlanLimitFilter> _logger;

    public RepurposePlanLimitFilter(AppDbContext db, ILogger<RepurposePlanLimitFilter> logger)
    {
        _db = db;
        _logger = logger;
    }

    public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
    {
        if (!context.RouteData.Values.TryGetValue("workspaceId", out var wsIdObj) ||
            wsIdObj is not string wsIdStr || !Guid.TryParse(wsIdStr, out var workspaceId))
        {
            await next();
            return;
        }

        var workspace = await _db.Workspaces
            .Include(w => w.UsageCounters)
            .Include(w => w.Subscription)
            .ThenInclude(s => s!.Plan)
            .FirstOrDefaultAsync(w => w.Id == workspaceId);

        if (workspace is null)
        {
            context.Result = new NotFoundObjectResult(new
            {
                code = "workspace_not_found",
                message = "Workspace not found"
            });
            return;
        }

        var subscription = workspace.Subscription;

        if (subscription is null || subscription.Plan is null)
        {
            context.Result = new ObjectResult(new
            {
                error = "subscription_required",
                message = "An active or trialing subscription is required to use this feature.",
                upgrade_url = $"/api/v2/workspaces/{workspaceId}/subscription/create-checkout-session"
            })
            { StatusCode = 402 };
            return;
        }

        var plan = subscription.Plan;

        if (subscription.Status == SubscriptionStatus.Expired || 
            (subscription.Status != SubscriptionStatus.Active && subscription.Status != SubscriptionStatus.Trialing))
        {
            context.Result = new ObjectResult(new
            {
                error = "subscription_expired",
                message = "Your subscription has expired or is inactive. Please renew your plan to continue using this feature.",
                upgrade_url = $"/api/v2/workspaces/{workspaceId}/subscription/create-checkout-session"
            })
            { StatusCode = 402 };
            return;
        }

        if (subscription.Status == SubscriptionStatus.Trialing && 
            subscription.TrialEndsAtUtc.HasValue && 
            subscription.TrialEndsAtUtc.Value < DateTime.UtcNow)
        {
            context.Result = new ObjectResult(new
            {
                error = "trial_expired",
                message = "Your 14-day free trial has expired. Please upgrade to a paid plan to continue using this feature.",
                upgrade_url = $"/api/v2/workspaces/{workspaceId}/subscription/create-checkout-session"
            })
            { StatusCode = 402 };
            return;
        }

        if (subscription.Status == SubscriptionStatus.Active && 
            subscription.EndsAtUtc.HasValue && 
            subscription.EndsAtUtc.Value < DateTime.UtcNow)
        {
            context.Result = new ObjectResult(new
            {
                error = "subscription_expired",
                message = "Your subscription has expired. Please renew your plan to continue using this feature.",
                upgrade_url = $"/api/v2/workspaces/{workspaceId}/subscription/create-checkout-session"
            })
            { StatusCode = 402 };
            return;
        }

        var usageCount = workspace.GetUsageCount(UsageMetricCode);
        if (usageCount >= plan.MaxRepurposeGenerationsPerMonth)
        {
            _logger.LogWarning(
                "Workspace {WorkspaceId} has exceeded repurpose generation limit ({Usage}/{Limit})",
                workspaceId, usageCount, plan.MaxRepurposeGenerationsPerMonth);

            context.Result = new ObjectResult(new
            {
                error = "plan_limit_exceeded",
                message = "You've reached your monthly repurpose generation limit. Upgrade your plan to generate more.",
                current_usage = usageCount,
                limit = plan.MaxRepurposeGenerationsPerMonth,
                upgrade_url = $"/api/v2/workspaces/{workspaceId}/subscription/create-checkout-session"
            })
            { StatusCode = 402 };
            return;
        }

        var executedContext = await next();

        if (!ShouldCountUsage(context, executedContext))
        {
            return;
        }

        workspace.IncrementUsage(UsageMetricCode);

        foreach (var entry in _db.ChangeTracker.Entries<UsageCounter>())
        {
            if (entry.State == EntityState.Modified)
            {
                var exists = await _db.UsageCounters.AnyAsync(c => c.Id == entry.Entity.Id);
                if (!exists)
                {
                    entry.State = EntityState.Added;
                }
            }
        }

        await _db.SaveChangesAsync();
    }

    private static bool ShouldCountUsage(ActionExecutingContext context, ActionExecutedContext executedContext)
    {
        var actionName = context.ActionDescriptor.RouteValues.TryGetValue("action", out var action)
            ? action
            : null;

        if (!string.Equals(actionName, "Generate", StringComparison.OrdinalIgnoreCase))
        {
            return false;
        }

        if (executedContext.Exception is not null && !executedContext.ExceptionHandled)
        {
            return false;
        }

        if (context.HttpContext.Items.TryGetValue("RepurposeGenerationSucceeded", out var streamSucceeded))
        {
            return streamSucceeded is true;
        }

        var statusCode = context.HttpContext.Response.StatusCode;
        return statusCode >= StatusCodes.Status200OK && statusCode < StatusCodes.Status300MultipleChoices;
    }
}
