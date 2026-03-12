
using System.Net;

namespace Syncra.Infrastructure.Publishing;

public static class PublishingErrorHelper
{
    public static PublishError FromHttpFailure(HttpStatusCode statusCode, string responseBody)
    {
        var error = new PublishError
        {
            Code = $"PROV_{(int)statusCode}",
            Message = $"Provider returned an error: {statusCode}",
            ProviderResponse = responseBody.Length > 500 ? responseBody.Substring(0, 500) : responseBody
        };

        error.IsTransient = statusCode switch
        {
            HttpStatusCode.TooManyRequests => true,
            >= HttpStatusCode.InternalServerError => true,
            _ => false
        };

        return error;
    }

    public static PublishError FromException(Exception ex)
    {
        return new PublishError
        {
            Code = "SYS_EXCEPTION",
            Message = ex.Message,
            IsTransient = ex is TaskCanceledException or TimeoutException
        };
    }
}
