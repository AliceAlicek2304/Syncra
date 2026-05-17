using System.Net;
using System.Net.Http;
using System.Threading;
using System.Threading.Tasks;
using FluentAssertions;
using Microsoft.Extensions.Options;
using Moq;
using Moq.Protected;
using Syncra.Application.Interfaces;
using Syncra.Application.Options;
using Syncra.Domain.Entities;
using Syncra.Infrastructure.Services;
using Xunit;

namespace Syncra.UnitTests.Infrastructure;

public class PostmarkEmailServiceTests
{
    private readonly Mock<HttpMessageHandler> _httpMessageHandlerMock;
    private readonly HttpClient _httpClient;
    private readonly PostmarkOptions _postmarkOptions;
    private readonly PostmarkEmailService _service;
    private readonly string _fromEmail = "noreply@syncra.app";
    private readonly string _fromName = "Syncra Support";
    private readonly string _apiKey = "test-api-key";

    public PostmarkEmailServiceTests()
    {
        _postmarkOptions = new PostmarkOptions
        {
            ApiKey = _apiKey,
            FromEmail = _fromEmail,
            FromName = _fromName
        };

        _httpMessageHandlerMock = new Mock<HttpMessageHandler>(MockBehavior.Strict);
        _httpClient = new HttpClient(_httpMessageHandlerMock.Object);

        var httpClientFactoryMock = new Mock<IHttpClientFactory>(MockBehavior.Strict);
        httpClientFactoryMock
            .Setup(f => f.CreateClient("PostmarkEmail"))
            .Returns(_httpClient);

        var optionsMock = new Mock<IOptions<PostmarkOptions>>(MockBehavior.Strict);
        optionsMock
            .Setup(o => o.Value)
            .Returns(_postmarkOptions);

        _service = new PostmarkEmailService(httpClientFactoryMock.Object, optionsMock.Object);
    }

    [Fact]
    public void PostmarkEmailService_ShouldImplementIEmailService()
    {
        // Assert
        _service.Should().BeAssignableTo<IEmailService>();
    }

    [Fact]
    public async Task SendPasswordResetEmailAsync_ShouldSendPostToPostmarkApi()
    {
        // Arrange
        var user = User.Create("test@example.com", "passwordHash");
        var resetToken = "test-reset-token";

        HttpRequestMessage? capturedRequest = null;

        _httpMessageHandlerMock
            .Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.IsAny<HttpRequestMessage>(),
                ItExpr.IsAny<CancellationToken>())
            .Callback<HttpRequestMessage, CancellationToken>((req, _) => capturedRequest = req)
            .ReturnsAsync(new HttpResponseMessage(HttpStatusCode.OK));

        // Act
        await _service.SendPasswordResetEmailAsync(user, resetToken);

        // Assert
        capturedRequest.Should().NotBeNull();
        capturedRequest!.Method.Should().Be(HttpMethod.Post);
        capturedRequest.RequestUri!.ToString().Should().Be("https://api.postmarkapp.com/email");
    }

    [Fact]
    public async Task SendPasswordResetEmailAsync_ShouldIncludePostmarkApiKeyHeader()
    {
        // Arrange
        var user = User.Create("test@example.com", "passwordHash");
        var resetToken = "test-reset-token";

        HttpRequestMessage? capturedRequest = null;

        _httpMessageHandlerMock
            .Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.IsAny<HttpRequestMessage>(),
                ItExpr.IsAny<CancellationToken>())
            .Callback<HttpRequestMessage, CancellationToken>((req, _) => capturedRequest = req)
            .ReturnsAsync(new HttpResponseMessage(HttpStatusCode.OK));

        // Act
        await _service.SendPasswordResetEmailAsync(user, resetToken);

        // Assert
        capturedRequest.Should().NotBeNull();
        capturedRequest!.Headers.Should().Contain(h => h.Key == "X-Postmark-Server-Token");
        capturedRequest.Headers.GetValues("X-Postmark-Server-Token").Should().Contain(_apiKey);
    }

    [Fact]
    public async Task SendPasswordResetEmailAsync_ShouldIncludeResetUrlInBody()
    {
        // Arrange
        var user = User.Create("test@example.com", "passwordHash");
        var resetToken = "test-reset-token";

        HttpRequestMessage? capturedRequest = null;

        _httpMessageHandlerMock
            .Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.IsAny<HttpRequestMessage>(),
                ItExpr.IsAny<CancellationToken>())
            .Callback<HttpRequestMessage, CancellationToken>((req, _) => capturedRequest = req)
            .ReturnsAsync(new HttpResponseMessage(HttpStatusCode.OK));

        // Act
        await _service.SendPasswordResetEmailAsync(user, resetToken);

        // Assert
        capturedRequest.Should().NotBeNull();
        var body = await capturedRequest!.Content!.ReadAsStringAsync();
        body.Should().Contain("https://syncra.app/reset-password?token=test-reset-token");
    }

    [Fact]
    public async Task SendPasswordResetEmailAsync_ShouldIncludeSyncraBranding()
    {
        // Arrange
        var user = User.Create("test@example.com", "passwordHash");
        var resetToken = "test-reset-token";

        HttpRequestMessage? capturedRequest = null;

        _httpMessageHandlerMock
            .Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.IsAny<HttpRequestMessage>(),
                ItExpr.IsAny<CancellationToken>())
            .Callback<HttpRequestMessage, CancellationToken>((req, _) => capturedRequest = req)
            .ReturnsAsync(new HttpResponseMessage(HttpStatusCode.OK));

        // Act
        await _service.SendPasswordResetEmailAsync(user, resetToken);

        // Assert
        capturedRequest.Should().NotBeNull();
        var body = await capturedRequest!.Content!.ReadAsStringAsync();
        body.Should().Contain("Syncra");
        body.Should().Contain("Reset your password");
        body.Should().Contain("Reset Password");
        body.Should().Contain("expires in 1 hour");
    }

    [Fact]
    public async Task SendPasswordResetEmailAsync_ShouldIncludePlainTextFallback()
    {
        // Arrange
        var user = User.Create("test@example.com", "passwordHash");
        var resetToken = "test-reset-token";

        HttpRequestMessage? capturedRequest = null;

        _httpMessageHandlerMock
            .Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.IsAny<HttpRequestMessage>(),
                ItExpr.IsAny<CancellationToken>())
            .Callback<HttpRequestMessage, CancellationToken>((req, _) => capturedRequest = req)
            .ReturnsAsync(new HttpResponseMessage(HttpStatusCode.OK));

        // Act
        await _service.SendPasswordResetEmailAsync(user, resetToken);

        // Assert
        capturedRequest.Should().NotBeNull();
        var body = await capturedRequest!.Content!.ReadAsStringAsync();
        body.Should().Contain("TextBody");
        body.Should().Contain("Click the link below to reset your password");
    }
}
