
using FluentAssertions;
using Microsoft.Extensions.Logging;
using Moq;
using Syncra.Domain.Models.Social;
using Syncra.Infrastructure.Publishing.Adapters;
using Xunit;

namespace Syncra.UnitTests.Infrastructure;

public class TikTokPublishAdapterTests
{
    private readonly Mock<ILogger<TikTokPublishAdapter>> _loggerMock = new();

    private TikTokPublishAdapter CreateAdapter()
    {
        return new TikTokPublishAdapter(_loggerMock.Object);
    }

    [Fact]
    public async Task PublishAsync_ShouldReturnNotSupportedError()
    {
        // Arrange
        var accessToken = "test-token";
        var request = new PublishRequest { Content = "Hello TikTok!" };
        var sut = CreateAdapter();

        // Act
        var result = await sut.PublishAsync(accessToken, request);

        // Assert
        result.IsSuccess.Should().BeFalse();
        result.Error.Should().NotBeNull();
        result.Error!.Code.Should().Be("not_supported");
        result.Error.IsTransient.Should().BeFalse();
    }
}
