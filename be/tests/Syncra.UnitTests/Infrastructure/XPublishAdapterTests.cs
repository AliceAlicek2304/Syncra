
using System.Net;
using System.Text.Json;
using FluentAssertions;
using Microsoft.Extensions.Logging;
using Moq;
using Moq.Protected;
using Syncra.Domain.Models.Social;
using Syncra.Infrastructure.Publishing.Adapters;
using Xunit;

namespace Syncra.UnitTests.Infrastructure;

public class XPublishAdapterTests
{
    private readonly Mock<ILogger<XPublishAdapter>> _loggerMock = new();
    private readonly Mock<HttpMessageHandler> _httpMessageHandlerMock = new();

    private XPublishAdapter CreateAdapter()
    {
        var httpClient = new HttpClient(_httpMessageHandlerMock.Object);
        return new XPublishAdapter(httpClient, _loggerMock.Object);
    }

    [Fact]
    public async Task PublishAsync_ShouldReturnSuccess_WhenApiReturns201()
    {
        // Arrange
        var accessToken = "test-token";
        var request = new PublishRequest { Content = "Hello X!" };
        var tweetId = "123456789";
        var responseContent = new
        {
            data = new
            {
                id = tweetId,
                text = "Hello X!"
            }
        };

        _httpMessageHandlerMock.Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.IsAny<HttpRequestMessage>(),
                ItExpr.IsAny<CancellationToken>())
            .ReturnsAsync(new HttpResponseMessage
            {
                StatusCode = HttpStatusCode.Created,
                Content = new StringContent(JsonSerializer.Serialize(responseContent))
            });

        var sut = CreateAdapter();

        // Act
        var result = await sut.PublishAsync(accessToken, request);

        // Assert
        result.IsSuccess.Should().BeTrue();
        result.ExternalId.Should().Be(tweetId);
        result.ExternalUrl.Should().Contain(tweetId);
        result.Error.Should().BeNull();
    }

    [Fact]
    public async Task PublishAsync_ShouldReturnFailure_WhenApiReturnsError()
    {
        // Arrange
        var accessToken = "test-token";
        var request = new PublishRequest { Content = "Hello X!" };
        var errorResponse = new { error = "Rate limit exceeded" };

        _httpMessageHandlerMock.Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.IsAny<HttpRequestMessage>(),
                ItExpr.IsAny<CancellationToken>())
            .ReturnsAsync(new HttpResponseMessage
            {
                StatusCode = HttpStatusCode.TooManyRequests,
                Content = new StringContent(JsonSerializer.Serialize(errorResponse))
            });

        var sut = CreateAdapter();

        // Act
        var result = await sut.PublishAsync(accessToken, request);

        // Assert
        result.IsSuccess.Should().BeFalse();
        result.Error.Should().NotBeNull();
        result.Error!.IsTransient.Should().BeTrue();
        result.Error.Code.Should().Be("PROV_429");
    }

    [Fact]
    public async Task PublishAsync_ShouldReturnFailure_WhenExceptionOccurs()
    {
        // Arrange
        var accessToken = "test-token";
        var request = new PublishRequest { Content = "Hello X!" };

        _httpMessageHandlerMock.Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.IsAny<HttpRequestMessage>(),
                ItExpr.IsAny<CancellationToken>())
            .ThrowsAsync(new HttpRequestException("Network error"));

        var sut = CreateAdapter();

        // Act
        var result = await sut.PublishAsync(accessToken, request);

        // Assert
        result.IsSuccess.Should().BeFalse();
        result.Error.Should().NotBeNull();
        result.Error!.Code.Should().Be("SYS_EXCEPTION");
    }
}
