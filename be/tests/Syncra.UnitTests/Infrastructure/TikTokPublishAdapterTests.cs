using System.Net;
using FluentAssertions;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Moq;
using Moq.Protected;
using Syncra.Application.Options;
using Syncra.Application.Repositories;
using Syncra.Domain.Entities;
using Syncra.Domain.Models.Social;
using Syncra.Infrastructure.Publishing.Adapters;
using Syncra.Infrastructure.Publishing.Adapters.TikTok;
using Xunit;

namespace Syncra.UnitTests.Infrastructure;

public class TikTokPublishAdapterTests
{
    private readonly Mock<ITikTokApiClient> _apiClientMock = new();
    private readonly Mock<IMediaRepository> _mediaRepositoryMock = new();
    private readonly Mock<ILogger<TikTokPublishAdapter>> _loggerMock = new();
    private readonly IOptions<StorageOptions> _storageOptions;

    public TikTokPublishAdapterTests()
    {
        _storageOptions = Options.Create(new StorageOptions
        {
            LocalRootPath = "C:/temp/syncra",
            PublicBaseUrl = "https://api.syncra.com/media"
        });
    }

    private TikTokPublishAdapter CreateAdapter()
    {
        return new TikTokPublishAdapter(
            _apiClientMock.Object,
            _mediaRepositoryMock.Object,
            _storageOptions,
            _loggerMock.Object);
    }

    [Fact]
    public async Task PublishAsync_ShouldReturnNoMediaError_WhenNoMediaProvided()
    {
        // Arrange
        var request = new PublishRequest { MediaIds = Array.Empty<Guid>() };
        _mediaRepositoryMock.Setup(r => r.GetByIdsAsync(It.IsAny<IReadOnlyCollection<Guid>>()))
            .ReturnsAsync(new List<Media>());
        
        var sut = CreateAdapter();

        // Act
        var result = await sut.PublishAsync("token", request);

        // Assert
        result.IsSuccess.Should().BeFalse();
        result.Error!.Code.Should().Be("no_media");
    }

    [Fact]
    public async Task PublishAsync_ShouldPublishVideoViaPullUrl_WhenVideoProvided()
    {
        // Arrange
        var mediaId = Guid.NewGuid();
        var request = new PublishRequest { MediaIds = new[] { mediaId }, Content = "Test Video" };
        var video = new Media 
        { 
            Id = mediaId, 
            MediaType = "video", 
            FileUrl = "https://api.syncra.com/media/video.mp4" 
        };

        _mediaRepositoryMock.Setup(r => r.GetByIdsAsync(It.IsAny<IReadOnlyCollection<Guid>>()))
            .ReturnsAsync(new List<Media> { video });

        _apiClientMock.Setup(c => c.InitializeVideoUploadAsync(It.IsAny<string>(), It.IsAny<TikTokVideoInitRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new TikTokVideoInitResponse(
                new TikTokVideoInitData("pub_123"),
                new TikTokError("ok", "", "log_123")
            ));

        var sut = CreateAdapter();

        // Act
        var result = await sut.PublishAsync("token", request);

        // Assert
        result.IsSuccess.Should().BeTrue();
        result.ExternalId.Should().Be("pub_123");
        _apiClientMock.Verify(c => c.InitializeVideoUploadAsync(
            "token", 
            It.Is<TikTokVideoInitRequest>(r => r.SourceInfo.Source == "PULL_FROM_URL" && r.SourceInfo.VideoUrl == video.FileUrl),
            It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task PublishAsync_ShouldPublishPhotos_WhenOnlyPhotosProvided()
    {
        // Arrange
        var mediaId = Guid.NewGuid();
        var request = new PublishRequest { MediaIds = new[] { mediaId }, Content = "Test Photo" };
        var photo = new Media 
        { 
            Id = mediaId, 
            MediaType = "image", 
            FileUrl = "https://api.syncra.com/media/photo.jpg" 
        };

        _mediaRepositoryMock.Setup(r => r.GetByIdsAsync(It.IsAny<IReadOnlyCollection<Guid>>()))
            .ReturnsAsync(new List<Media> { photo });

        _apiClientMock.Setup(c => c.InitializeContentPublishAsync(It.IsAny<string>(), It.IsAny<TikTokContentInitRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new TikTokContentInitResponse(
                new TikTokContentInitData("pub_456"),
                new TikTokError("ok", "", "log_456")
            ));

        var sut = CreateAdapter();

        // Act
        var result = await sut.PublishAsync("token", request);

        // Assert
        result.IsSuccess.Should().BeTrue();
        result.ExternalId.Should().Be("pub_456");
        _apiClientMock.Verify(c => c.InitializeContentPublishAsync(
            "token", 
            It.Is<TikTokContentInitRequest>(r => r.SourceInfo.Source == "PULL_FROM_URL" && r.SourceInfo.PhotoImages.Contains(photo.FileUrl)),
            It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task PublishAsync_ShouldReturnMappedError_WhenApiFails()
    {
        // Arrange
        var mediaId = Guid.NewGuid();
        var request = new PublishRequest { MediaIds = new[] { mediaId } };
        var video = new Media { Id = mediaId, MediaType = "video", FileUrl = "url" };

        _mediaRepositoryMock.Setup(r => r.GetByIdsAsync(It.IsAny<IReadOnlyCollection<Guid>>()))
            .ReturnsAsync(new List<Media> { video });

        _apiClientMock.Setup(c => c.InitializeVideoUploadAsync(It.IsAny<string>(), It.IsAny<TikTokVideoInitRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new TikTokVideoInitResponse(
                null!,
                new TikTokError("rate_limit_exceeded", "Slow down", "log_err")
            ));

        var sut = CreateAdapter();

        // Act
        var result = await sut.PublishAsync("token", request);

        // Assert
        result.IsSuccess.Should().BeFalse();
        result.Error!.Code.Should().Be("TIKTOK_RATE_LIMIT_EXCEEDED");
        result.Error.IsTransient.Should().BeTrue();
    }

    [Theory]
    [InlineData("spam_risk_too_many_pending_share", "TIKTOK_SPAM_RISK_LIMIT")]
    [InlineData("spam_risk_user_banned_from_posting", "TIKTOK_USER_BANNED")]
    [InlineData("url_ownership_unverified", "TIKTOK_URL_UNVERIFIED")]
    [InlineData("access_token_invalid", "TIKTOK_AUTH_INVALID")]
    [InlineData("scope_not_authorized", "TIKTOK_SCOPE_MISSING")]
    [InlineData("random_error", "TIKTOK_RANDOM_ERROR")]
    public async Task PublishAsync_ShouldMapSpecificErrorCodesCorrectly(string apiErrorCode, string expectedMappedCode)
    {
        // Arrange
        var mediaId = Guid.NewGuid();
        var request = new PublishRequest { MediaIds = new[] { mediaId } };
        var video = new Media { Id = mediaId, MediaType = "video", FileUrl = "url" };

        _mediaRepositoryMock.Setup(r => r.GetByIdsAsync(It.IsAny<IReadOnlyCollection<Guid>>()))
            .ReturnsAsync(new List<Media> { video });

        _apiClientMock.Setup(c => c.InitializeVideoUploadAsync(It.IsAny<string>(), It.IsAny<TikTokVideoInitRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new TikTokVideoInitResponse(
                null!,
                new TikTokError(apiErrorCode, "Error message", "log_id")
            ));

        var sut = CreateAdapter();

        // Act
        var result = await sut.PublishAsync("token", request);

        // Assert
        result.IsSuccess.Should().BeFalse();
        result.Error!.Code.Should().Be(expectedMappedCode);
    }

    [Fact]
    public async Task PublishAsync_ShouldPublishMultiplePhotos()
    {
        // Arrange
        var photo1Id = Guid.NewGuid();
        var photo2Id = Guid.NewGuid();
        var request = new PublishRequest { MediaIds = new[] { photo1Id, photo2Id }, Content = "Multiple Photos" };
        var photos = new List<Media>
        {
            new Media { Id = photo1Id, MediaType = "image", FileUrl = "url1" },
            new Media { Id = photo2Id, MediaType = "image", FileUrl = "url2" }
        };

        _mediaRepositoryMock.Setup(r => r.GetByIdsAsync(It.IsAny<IReadOnlyCollection<Guid>>()))
            .ReturnsAsync(photos);

        _apiClientMock.Setup(c => c.InitializeContentPublishAsync(It.IsAny<string>(), It.IsAny<TikTokContentInitRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new TikTokContentInitResponse(
                new TikTokContentInitData("pub_multi"),
                new TikTokError("ok", "", "log_multi")
            ));

        var sut = CreateAdapter();

        // Act
        var result = await sut.PublishAsync("token", request);

        // Assert
        result.IsSuccess.Should().BeTrue();
        result.ExternalId.Should().Be("pub_multi");
        _apiClientMock.Verify(c => c.InitializeContentPublishAsync(
            "token",
            It.Is<TikTokContentInitRequest>(r => 
                r.SourceInfo.PhotoImages.Count == 2 && 
                r.SourceInfo.PhotoImages.Contains("url1") && 
                r.SourceInfo.PhotoImages.Contains("url2")),
            It.IsAny<CancellationToken>()), Times.Once);
    }
}
