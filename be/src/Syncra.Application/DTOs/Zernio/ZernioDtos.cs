namespace Syncra.Application.DTOs.Zernio;

public sealed record ZernioConnectUrlResult(string ConnectUrl);

public sealed record ZernioAccountDto(
    string Id,
    string Platform,
    string DisplayName,
    bool IsConnected);

public sealed record ZernioProfileDto(
    string Id,
    string Name);

public sealed record ZernioSelectOptionDto(
    string Id,
    string Name,
    string? AvatarUrl = null);

public sealed record ZernioSelectResultDto(
    string AccountId,
    string Platform,
    string DisplayName,
    string? ProfilePicture);
