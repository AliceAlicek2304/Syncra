using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Stripe;
using Syncra.Application.Options;
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
    private readonly StripeOptions _stripeOptions;

    public AdminStripeSyncController(AppDbContext dbContext, IOptions<StripeOptions> stripeOptions)
    {
        _dbContext = dbContext;
        _stripeOptions = stripeOptions.Value;
    }

    [HttpPost("sync-plans")]
    public async Task<IActionResult> SyncPlans(CancellationToken cancellationToken)
    {
        Console.WriteLine("[AdminStripeSync] Starting plan sync...");
        var requestOptions = new RequestOptions { ApiKey = _stripeOptions.SecretKey };
        var productService = new ProductService();
        var priceService = new PriceService();

        var products = await productService.ListAsync(
            new ProductListOptions { Active = true }, 
            requestOptions: requestOptions,
            cancellationToken: cancellationToken);

        Console.WriteLine($"[AdminStripeSync] Found {products.Count()} products in Stripe.");

        int added = 0;
        int updated = 0;

        foreach (var product in products)
        {
            var prices = await priceService.ListAsync(
                new PriceListOptions { Product = product.Id, Active = true }, 
                requestOptions: requestOptions,
                cancellationToken: cancellationToken);

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
                added++;
            }
            else
            {
                updated++;
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
        Console.WriteLine($"[AdminStripeSync] Sync completed. Added: {added}, Updated: {updated}.");

        return Ok(new { Added = added, Updated = updated });
    }
}
