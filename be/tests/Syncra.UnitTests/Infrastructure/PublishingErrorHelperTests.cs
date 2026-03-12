
using System.Net;
using FluentAssertions;
using Syncra.Infrastructure.Publishing;
using Xunit;

namespace Syncra.UnitTests.Infrastructure;

public class PublishingErrorHelperTests
{
    [Theory]
    [InlineData(HttpStatusCode.TooManyRequests, true)]
    [InlineData(HttpStatusCode.InternalServerError, true)]
    [InlineData(HttpStatusCode.BadGateway, true)]
    [InlineData(HttpStatusCode.ServiceUnavailable, true)]
    [InlineData(HttpStatusCode.GatewayTimeout, true)]
    [InlineData(HttpStatusCode.BadRequest, false)]
    [InlineData(HttpStatusCode.Unauthorized, false)]
    [InlineData(HttpStatusCode.Forbidden, false)]
    [InlineData(HttpStatusCode.NotFound, false)]
    public void FromHttpFailure_ShouldClassifyTransientErrorsCorrectly(HttpStatusCode statusCode, bool expectedIsTransient)
    {
        // Act
        var error = PublishingErrorHelper.FromHttpFailure(statusCode, "");

        // Assert
        error.IsTransient.Should().Be(expectedIsTransient);
    }

    [Fact]
    public void FromException_ShouldClassifyTaskCanceledExceptionAsTransient()
    {
        // Arrange
        var ex = new TaskCanceledException();

        // Act
        var error = PublishingErrorHelper.FromException(ex);

        // Assert
        error.IsTransient.Should().Be(true);
    }

    [Fact]
    public void FromException_ShouldClassifyTimeoutExceptionAsTransient()
    {
        // Arrange
        var ex = new TimeoutException();

        // Act
        var error = PublishingErrorHelper.FromException(ex);

        // Assert
        error.IsTransient.Should().Be(true);
    }

    [Fact]
    public void FromException_ShouldClassifyOtherExceptionsAsNonTransient()
    {
        // Arrange
        var ex = new InvalidOperationException();

        // Act
        var error = PublishingErrorHelper.FromException(ex);

        // Assert
        error.IsTransient.Should().Be(false);
    }
}
