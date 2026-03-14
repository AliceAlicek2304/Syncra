using Microsoft.OpenApi.Models;
using Swashbuckle.AspNetCore.SwaggerGen;

namespace Syncra.Api.SwaggerFilters;

/// <summary>
/// Adds an optional 'Idempotency-Key' header parameter to Swagger UI for POST, PUT, and PATCH methods.
/// </summary>
public class IdempotencyHeaderFilter : IOperationFilter
{
    public void Apply(OpenApiOperation operation, OperationFilterContext context)
    {
        var method = context.ApiDescription.HttpMethod?.ToUpper();
        if (method is not ("POST" or "PUT" or "PATCH"))
            return;

        operation.Parameters ??= new List<OpenApiParameter>();

        operation.Parameters.Add(new OpenApiParameter
        {
            Name = "Idempotency-Key",
            In = ParameterLocation.Header,
            Required = false,
            Schema = new OpenApiSchema
            {
                Type = "string"
            },
            Description = "A unique key (e.g. UUID) to ensure request idempotency. If the header is provided, the API will guarantee only one execution for the same key."
        });
    }
}
