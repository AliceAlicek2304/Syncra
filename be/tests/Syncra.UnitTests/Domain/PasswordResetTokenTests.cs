using Syncra.Domain.Entities;
using Xunit;

namespace Syncra.UnitTests.Domain;

public class PasswordResetTokenTests
{
    [Fact]
    public void Create_ShouldSetProperties()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var tokenHash = "sha256hashvalue";
        var expiresAt = DateTime.UtcNow.AddHours(1);

        // Act
        var token = new PasswordResetToken
        {
            UserId = userId,
            TokenHash = tokenHash,
            ExpiresAtUtc = expiresAt
        };

        // Assert
        Assert.Equal(userId, token.UserId);
        Assert.Equal(tokenHash, token.TokenHash);
        Assert.Equal(expiresAt, token.ExpiresAtUtc);
        Assert.Null(token.UsedAtUtc);
    }

    [Fact]
    public void IsExpired_ShouldReturnTrue_WhenPastExpiry()
    {
        // Arrange
        var token = new PasswordResetToken
        {
            ExpiresAtUtc = DateTime.UtcNow.AddHours(-1)
        };

        // Assert
        Assert.True(token.IsExpired);
    }

    [Fact]
    public void IsExpired_ShouldReturnFalse_WhenNotExpired()
    {
        // Arrange
        var token = new PasswordResetToken
        {
            ExpiresAtUtc = DateTime.UtcNow.AddHours(1)
        };

        // Assert
        Assert.False(token.IsExpired);
    }

    [Fact]
    public void IsUsed_ShouldReturnFalse_WhenNotUsed()
    {
        // Arrange
        var token = new PasswordResetToken();

        // Assert
        Assert.False(token.IsUsed);
    }

    [Fact]
    public void IsUsed_ShouldReturnTrue_WhenUsed()
    {
        // Arrange
        var token = new PasswordResetToken
        {
            UsedAtUtc = DateTime.UtcNow
        };

        // Assert
        Assert.True(token.IsUsed);
    }

    [Fact]
    public void IsValid_ShouldReturnTrue_WhenNotExpiredAndNotUsed()
    {
        // Arrange
        var token = new PasswordResetToken
        {
            ExpiresAtUtc = DateTime.UtcNow.AddHours(1)
        };

        // Assert
        Assert.True(token.IsValid);
    }

    [Fact]
    public void IsValid_ShouldReturnFalse_WhenExpired()
    {
        // Arrange
        var token = new PasswordResetToken
        {
            ExpiresAtUtc = DateTime.UtcNow.AddHours(-1)
        };

        // Assert
        Assert.False(token.IsValid);
    }

    [Fact]
    public void IsValid_ShouldReturnFalse_WhenUsed()
    {
        // Arrange
        var token = new PasswordResetToken
        {
            ExpiresAtUtc = DateTime.UtcNow.AddHours(1),
            UsedAtUtc = DateTime.UtcNow
        };

        // Assert
        Assert.False(token.IsValid);
    }

    [Fact]
    public void MarkAsUsed_ShouldSetUsedAtUtcAndUpdatedAtUtc()
    {
        // Arrange
        var token = new PasswordResetToken
        {
            ExpiresAtUtc = DateTime.UtcNow.AddHours(1)
        };

        // Act
        token.MarkAsUsed();

        // Assert
        Assert.NotNull(token.UsedAtUtc);
        Assert.NotNull(token.UpdatedAtUtc);
    }

    [Fact]
    public void MarkAsUsed_ShouldBeIdempotent()
    {
        // Arrange
        var token = new PasswordResetToken
        {
            ExpiresAtUtc = DateTime.UtcNow.AddHours(1)
        };

        // Act
        token.MarkAsUsed();
        var firstUsedAt = token.UsedAtUtc;
        token.MarkAsUsed();

        // Assert
        Assert.NotNull(token.UsedAtUtc);
        Assert.Equal(firstUsedAt, token.UsedAtUtc);
    }
}
