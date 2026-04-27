using Microsoft.AspNetCore.Mvc;
using Syncra.Domain.Common;

namespace Syncra.Api.Common;

public static class ResultExtensions
{
    public static IActionResult ToActionResult<T>(this Result<T> result)
    {
        if (result.IsSuccess)
        {
            return new OkObjectResult(result.Value);
        }

        return new BadRequestObjectResult(new { error = result.Error });
    }

    public static IActionResult ToActionResult(this Result result)
    {
        if (result.IsSuccess)
        {
            return new OkResult();
        }

        return new BadRequestObjectResult(new { error = result.Error });
    }
}
