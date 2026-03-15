using System.Security.Claims;

namespace Syncra.Shared.Extensions;

public static class ClaimsPrincipalExtensions
{
    /// <summary>
    /// Extracts the authenticated user's ID from the NameIdentifier claim.
    /// Returns null if the claim is missing or not a valid Guid.
    /// </summary>
    public static Guid? GetUserId(this ClaimsPrincipal principal)
    {
        var claim = principal.FindFirst(ClaimTypes.NameIdentifier);
        if (claim is null) return null;
        return Guid.TryParse(claim.Value, out var id) ? id : null;
    }
}
