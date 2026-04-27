#if FALSE

using FluentAssertions;
using Microsoft.Extensions.Logging;
using Moq;
using Syncra.Domain.Models.Social;
using Syncra.Infrastructure.Publishing.Adapters;
using Xunit;

namespace Syncra.UnitTests.Infrastructure;

public class YouTubePublishAdapterTests
{
    private readonly Mock<ILogger<YouTubePublishAdapter>> _loggerMock = new();

    private YouTubePublishAdapter CreateAdapter()
    {
        return new YouTubePublishAdapter(_loggerMock.Object);
    }

    [Fact]
    public async Task PublishAsync_ShouldReturnNotSupportedError()
    {
        // Arrange
        var accessToken = "test-token";
        var request = new PublishRequest { Content = "Hello YouTube!" };
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
#endif
