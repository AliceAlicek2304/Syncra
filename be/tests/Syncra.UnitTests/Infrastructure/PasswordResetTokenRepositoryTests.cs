using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Syncra.Domain.Entities;
using Syncra.Infrastructure.Persistence;
using Syncra.Infrastructure.Repositories;
using Xunit;

namespace Syncra.UnitTests.Infrastructure;

public class PasswordResetTokenRepositoryTests : IDisposable
{
    private readonly SqliteConnection _connection;
    private readonly DbContextOptions<AppDbContext> _options;

    public PasswordResetTokenRepositoryTests()
    {
        _connection = new SqliteConnection("Filename=:memory:;Foreign Keys=False");
        _connection.Open();

        _options = new DbContextOptionsBuilder<AppDbContext>()
            .UseSqlite(_connection)
            .Options;

        using var context = new AppDbContext(_options);
        context.Database.EnsureCreated();
    }

    public void Dispose()
    {
        _connection.Close();
        _connection.Dispose();
    }

    private AppDbContext CreateContext() => new AppDbContext(_options);

    private User CreateTestUser(AppDbContext context)
    {
        var user = User.Create("test@example.com", "password_hash");
        context.Users.Add(user);
        context.SaveChanges();
        return user;
    }

    [Fact]
    public async Task AddAsync_ShouldPersistToken()
    {
        // Arrange
        using var context = CreateContext();
        var user = CreateTestUser(context);
        var sut = new PasswordResetTokenRepository(context);

        var token = new PasswordResetToken
        {
            UserId = user.Id,
            TokenHash = "sha256hash",
            ExpiresAtUtc = DateTime.UtcNow.AddHours(1)
        };

        // Act
        await sut.AddAsync(token);
        await context.SaveChangesAsync();

        // Assert
        var saved = await context.Set<PasswordResetToken>().FindAsync(token.Id);
        Assert.NotNull(saved);
        Assert.Equal(token.TokenHash, saved.TokenHash);
    }

    [Fact]
    public async Task GetByTokenHashAsync_ShouldReturnTokenWithUser()
    {
        // Arrange
        using var context = CreateContext();
        var user = CreateTestUser(context);
        var sut = new PasswordResetTokenRepository(context);

        var token = new PasswordResetToken
        {
            UserId = user.Id,
            TokenHash = "sha256hash",
            ExpiresAtUtc = DateTime.UtcNow.AddHours(1)
        };

        context.Set<PasswordResetToken>().Add(token);
        await context.SaveChangesAsync();

        // Act
        var result = await sut.GetByTokenHashAsync("sha256hash");

        // Assert
        Assert.NotNull(result);
        Assert.Equal(token.Id, result.Id);
        Assert.Equal(token.TokenHash, result.TokenHash);
        Assert.NotNull(result.User);
        Assert.Equal(user.Id, result.User.Id);
    }

    [Fact]
    public async Task GetByTokenHashAsync_ShouldReturnNull_WhenNotFound()
    {
        // Arrange
        using var context = CreateContext();
        var sut = new PasswordResetTokenRepository(context);

        // Act
        var result = await sut.GetByTokenHashAsync("nonexistent");

        // Assert
        Assert.Null(result);
    }

    [Fact]
    public async Task MarkAsUsedAsync_ShouldSetUsedAtUtc()
    {
        // Arrange
        using var context = CreateContext();
        var user = CreateTestUser(context);
        var sut = new PasswordResetTokenRepository(context);

        var token = new PasswordResetToken
        {
            UserId = user.Id,
            TokenHash = "sha256hash",
            ExpiresAtUtc = DateTime.UtcNow.AddHours(1)
        };

        context.Set<PasswordResetToken>().Add(token);
        await context.SaveChangesAsync();

        // Act
        await sut.MarkAsUsedAsync(token.Id);
        await context.SaveChangesAsync();

        // Assert
        var saved = await context.Set<PasswordResetToken>().FindAsync(token.Id);
        Assert.NotNull(saved);
        Assert.NotNull(saved.UsedAtUtc);
    }

    [Fact]
    public async Task MarkAsUsedAsync_ShouldNotThrow_WhenTokenNotFound()
    {
        // Arrange
        using var context = CreateContext();
        var sut = new PasswordResetTokenRepository(context);

        // Act & Assert
        await sut.MarkAsUsedAsync(Guid.NewGuid());
        // Should not throw
    }
}
