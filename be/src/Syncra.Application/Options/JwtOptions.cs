using Syncra.Application.Common.Interfaces;

namespace Syncra.Application.Options;

public class JwtOptions : IJwtOptions
{
    public const string SectionName = "Jwt";
    public string Secret { get; set; } = string.Empty;
    public string Issuer { get; set; } = "Syncra";
    public string Audience { get; set; } = "Syncra";
    public int ExpirationMinutes { get; set; } = 60;
    public int RefreshTokenExpirationDays { get; set; } = 7;
}
