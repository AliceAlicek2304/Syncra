namespace Syncra.Infrastructure.Publishing.Adapters.TikTok;

public interface ITikTokApiClient
{
    Task<TikTokVideoInitResponse> InitializeVideoUploadAsync(
        string accessToken,
        TikTokVideoInitRequest request,
        CancellationToken cancellationToken = default);

    Task UploadVideoChunkAsync(
        string uploadUrl,
        Stream chunkStream,
        long startByte,
        long totalBytes,
        CancellationToken cancellationToken = default);

    Task<TikTokContentInitResponse> InitializeContentPublishAsync(
        string accessToken,
        TikTokContentInitRequest request,
        CancellationToken cancellationToken = default);

    Task<TikTokStatusResponse> GetPostStatusAsync(
        string accessToken,
        string publishId,
        CancellationToken cancellationToken = default);
}
