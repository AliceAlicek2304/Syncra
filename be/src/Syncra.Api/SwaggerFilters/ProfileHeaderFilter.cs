using Microsoft.OpenApi.Models;
using Swashbuckle.AspNetCore.SwaggerGen;

namespace Syncra.Api.SwaggerFilters;

public class ProfileHeaderFilter : IOperationFilter
{
    public void Apply(OpenApiOperation operation, OperationFilterContext context)
    {
        var controllerName = context.MethodInfo.DeclaringType?.Name;
        if (controllerName != null && 
            (controllerName.StartsWith("Auth", StringComparison.OrdinalIgnoreCase) || 
             controllerName.StartsWith("Users", StringComparison.OrdinalIgnoreCase)))
        {
            return;
        }

        operation.Parameters ??= new List<OpenApiParameter>();

        operation.Parameters.Add(new OpenApiParameter
        {
            Name = "X-Profile-Id",
            In = ParameterLocation.Header,
            Required = false,
            Schema = new OpenApiSchema
            {
                Type = "string",
                Format = "uuid"
            },
            Description = "Zernio Profile ID for entity filtering within a workspace."
        });
    }
}
