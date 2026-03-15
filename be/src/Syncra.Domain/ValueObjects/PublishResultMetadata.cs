namespace Syncra.Domain.ValueObjects;

public sealed class PublishResultMetadata
{
    public string? ExternalId { get; }
    public string? ExternalUrl { get; }
    public string? ProviderResponseMetadata { get; }

    private PublishResultMetadata(string? externalId, string? externalUrl, string? providerResponseMetadata)
    {
        ExternalId = externalId;
        ExternalUrl = externalUrl;
        ProviderResponseMetadata = providerResponseMetadata;
    }

    public static PublishResultMetadata Empty => new(null, null, null);

    public static PublishResultMetadata Create(
        string? externalId,
        string? externalUrl,
        string? providerResponseMetadata = null)
    {
        return new PublishResultMetadata(
            string.IsNullOrWhiteSpace(externalId) ? null : externalId,
            string.IsNullOrWhiteSpace(externalUrl) ? null : externalUrl,
            string.IsNullOrWhiteSpace(providerResponseMetadata) ? null : providerResponseMetadata);
    }

    public bool HasExternalId => !string.IsNullOrWhiteSpace(ExternalId);
    public bool HasExternalUrl => !string.IsNullOrWhiteSpace(ExternalUrl);

    public bool IsEmpty => !HasExternalId && !HasExternalUrl && string.IsNullOrWhiteSpace(ProviderResponseMetadata);
}