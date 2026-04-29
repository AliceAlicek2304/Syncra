using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Stripe;
using Syncra.Infrastructure.Persistence;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace Syncra.Api.Controllers;

[ApiController]
[Route("api/admin/stripe")]
public class AdminStripeSyncController : ControllerBase
{
    private readonly AppDbContext _dbContext;

    public AdminStripeSyncController(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    [HttpPost("sync-plans")]
    public async Task<IActionResult> SyncPlans(CancellationToken cancellationToken)
    {
        var productService = new ProductService();
        var priceService = new PriceService();

        var products = await productService.ListAsync(new ProductListOptions { Active = true }, cancellationToken: cancellationToken);

        foreach (var product in products)
        {
            var prices = await priceService.ListAsync(new PriceListOptions { Product = product.Id, Active = true }, cancellationToken: cancellationToken);

            var monthlyPrice = prices.FirstOrDefault(p => p.Recurring?.Interval == "month");
            var yearlyPrice = prices.FirstOrDefault(p => p.Recurring?.Interval == "year");

            var plan = await _dbContext.Plans.FirstOrDefaultAsync(p => p.StripeProductId == product.Id, cancellationToken);
            
            if (plan == null)
            {
                plan = new Syncra.Domain.Entities.Plan
                {
                    StripeProductId = product.Id,
                    Code = product.Name.ToUpperInvariant().Replace(" ", "_"),
                    MaxMembers = 1,
                    MaxSocialAccounts = 1,
                    MaxScheduledPostsPerMonth = 10,
                    IsActive = true
                };
                _dbContext.Plans.Add(plan);
            }

            plan.Name = product.Name;
            
            if (monthlyPrice != null)
            {
                plan.StripeMonthlyPriceId = monthlyPrice.Id;
                plan.PriceMonthly = monthlyPrice.UnitAmountDecimal.GetValueOrDefault() / 100m;
            }

            if (yearlyPrice != null)
            {
                plan.StripeYearlyPriceId = yearlyPrice.Id;
                plan.PriceYearly = yearlyPrice.UnitAmountDecimal.GetValueOrDefault() / 100m;
            }
        }

        await _dbContext.SaveChangesAsync(cancellationToken);

        return Ok();
    }
}
