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
