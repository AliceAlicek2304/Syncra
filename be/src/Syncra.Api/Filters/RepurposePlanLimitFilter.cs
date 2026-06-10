using System.Security.Claims;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.EntityFrameworkCore;
using Syncra.Application.Options;
using Syncra.Domain.Entities;
using Syncra.Infrastructure.Persistence;

namespace Syncra.Api.Filters;

public sealed class RepurposePlanLimitFilter : IAsyncActionFilter
{
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

        var plan = workspace.Subscription?.Plan;
        if (plan is null)
        {
            await next();
            return;
        }

        var usageCount = workspace.GetUsageCount("repurpose_generations");
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

        await next();

        workspace.IncrementUsage("repurpose_generations");

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
}
