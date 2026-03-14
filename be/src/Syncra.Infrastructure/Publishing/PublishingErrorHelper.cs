
using System.Net;
using Syncra.Domain.Models.Social;

namespace Syncra.Infrastructure.Publishing;

public static class PublishingErrorHelper
{
    public static ProviderError FromHttpFailure(HttpStatusCode statusCode, string responseBody)
    {
        var error = new ProviderError
        {
            Code = $"PROV_{(int)statusCode}",
            Message = $"Provider returned an error: {statusCode}",
            Details = responseBody.Length > 500 ? responseBody.Substring(0, 500) : responseBody
        };

        error.IsTransient = statusCode switch
        {
            HttpStatusCode.TooManyRequests => true,
            >= HttpStatusCode.InternalServerError => true,
            _ => false
        };

        return error;
    }

    public static ProviderError FromException(Exception ex)
    {
        return new ProviderError
        {
            Code = "SYS_EXCEPTION",
            Message = ex.Message,
            IsTransient = ex is TaskCanceledException or TimeoutException
        };
    }
}
