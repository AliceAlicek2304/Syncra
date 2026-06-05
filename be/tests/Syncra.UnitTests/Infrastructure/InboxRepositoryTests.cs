using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Moq;
using Syncra.Domain.Entities;
using Syncra.Domain.Interfaces;
using Syncra.Infrastructure.Persistence;
using Syncra.Infrastructure.Repositories;
using Xunit;

namespace Syncra.UnitTests.Infrastructure;

public class InboxRepositoryTests : IDisposable
{
    private readonly SqliteConnection _connection;
    private readonly DbContextOptions<AppDbContext> _options;

    public InboxRepositoryTests()
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

    [Fact]
    public async Task GetCommentedPostByZernioPostIdAsync_ExactMatch_ReturnsPost()
    {
        // Arrange
        var workspaceId = Guid.NewGuid();
        var zernioPostId = "1115939828259807_122111403201091110";
        using var context = CreateContext();

        var post = InboxCommentedPost.Create(
            workspaceId,
            zernioPostId,
            socialAccountId: null,
            platform: "facebook",
            zernioAccountId: "account-123"
        );
        context.InboxCommentedPosts.Add(post);
        await context.SaveChangesAsync();

        var mockUnitOfWork = new Mock<IUnitOfWork>();
        var sut = new InboxRepository(context, mockUnitOfWork.Object);

        // Act
        var result = await sut.GetCommentedPostByZernioPostIdAsync(workspaceId, zernioPostId);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(zernioPostId, result!.ZernioPostId);
    }

    [Fact]
    public async Task GetCommentedPostByZernioPostIdAsync_SuffixMatch_ReturnsPost()
    {
        // Arrange
        var workspaceId = Guid.NewGuid();
        var zernioPostId = "1115939828259807_122111403201091110";
        using var context = CreateContext();

        var post = InboxCommentedPost.Create(
            workspaceId,
            zernioPostId,
            socialAccountId: null,
            platform: "facebook",
            zernioAccountId: "account-123"
        );
        context.InboxCommentedPosts.Add(post);
        await context.SaveChangesAsync();

        var mockUnitOfWork = new Mock<IUnitOfWork>();
        var sut = new InboxRepository(context, mockUnitOfWork.Object);

        // Act - Look up only using the post ID part of the comment ID (parts[0])
        var result = await sut.GetCommentedPostByZernioPostIdAsync(workspaceId, "122111403201091110");

        // Assert
        Assert.NotNull(result);
        Assert.Equal(zernioPostId, result!.ZernioPostId);
    }

    [Fact]
    public async Task GetCommentedPostByZernioPostIdAsync_NoMatch_ReturnsNull()
    {
        // Arrange
        var workspaceId = Guid.NewGuid();
        var zernioPostId = "1115939828259807_122111403201091110";
        using var context = CreateContext();

        var post = InboxCommentedPost.Create(
            workspaceId,
            zernioPostId,
            socialAccountId: null,
            platform: "facebook",
            zernioAccountId: "account-123"
        );
        context.InboxCommentedPosts.Add(post);
        await context.SaveChangesAsync();

        var mockUnitOfWork = new Mock<IUnitOfWork>();
        var sut = new InboxRepository(context, mockUnitOfWork.Object);

        // Act
        var result = await sut.GetCommentedPostByZernioPostIdAsync(workspaceId, "nonexistent");

        // Assert
        Assert.Null(result);
    }

    [Fact]
    public async Task DeleteCommentThreadAsync_ExistingThread_DeletesThread()
    {
        // Arrange
        var workspaceId = Guid.NewGuid();
        var zernioPostId = "post-123";
        using var context = CreateContext();

        var thread = InboxCommentThread.Create(workspaceId, zernioPostId, "{}", DateTime.UtcNow.AddHours(1));
        context.InboxCommentThreads.Add(thread);
        await context.SaveChangesAsync();

        var mockUnitOfWork = new Mock<IUnitOfWork>();
        mockUnitOfWork.Setup(u => u.SaveChangesAsync(It.IsAny<CancellationToken>()))
            .Returns<CancellationToken>(ct => context.SaveChangesAsync(ct));
        var sut = new InboxRepository(context, mockUnitOfWork.Object);

        // Act
        await sut.DeleteCommentThreadAsync(workspaceId, zernioPostId);

        // Assert
        var result = await context.InboxCommentThreads.FirstOrDefaultAsync(t => t.WorkspaceId == workspaceId && t.ZernioPostId == zernioPostId);
        Assert.Null(result);
    }

    [Fact]
    public async Task DeleteCommentThreadAsync_WithUnderscorePostId_DeletesThreadAndPrefix()
    {
        // Arrange
        var workspaceId = Guid.NewGuid();
        var zernioPostId = "122111403201091110_1535892128169201";
        var prefix = "122111403201091110";
        using var context = CreateContext();

        var thread1 = InboxCommentThread.Create(workspaceId, zernioPostId, "{}", DateTime.UtcNow.AddHours(1));
        var thread2 = InboxCommentThread.Create(workspaceId, prefix, "{}", DateTime.UtcNow.AddHours(1));
        var thread3 = InboxCommentThread.Create(workspaceId, $"{prefix}_another_comment", "{}", DateTime.UtcNow.AddHours(1));
        context.InboxCommentThreads.AddRange(thread1, thread2, thread3);
        await context.SaveChangesAsync();

        var mockUnitOfWork = new Mock<IUnitOfWork>();
        mockUnitOfWork.Setup(u => u.SaveChangesAsync(It.IsAny<CancellationToken>()))
            .Returns<CancellationToken>(ct => context.SaveChangesAsync(ct));
        var sut = new InboxRepository(context, mockUnitOfWork.Object);

        // Act
        await sut.DeleteCommentThreadAsync(workspaceId, zernioPostId);

        // Assert
        var result1 = await context.InboxCommentThreads.FirstOrDefaultAsync(t => t.ZernioPostId == zernioPostId);
        var result2 = await context.InboxCommentThreads.FirstOrDefaultAsync(t => t.ZernioPostId == prefix);
        var result3 = await context.InboxCommentThreads.FirstOrDefaultAsync(t => t.ZernioPostId == $"{prefix}_another_comment");

        Assert.Null(result1);
        Assert.Null(result2);
        Assert.Null(result3);
    }
}
