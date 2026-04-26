using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Syncra.Domain.Entities;
using Syncra.Domain.Enums;
using Syncra.Domain.ValueObjects;
using Syncra.Infrastructure.Persistence;
using Syncra.Infrastructure.Repositories;
using Xunit;

namespace Syncra.UnitTests.Infrastructure;

public class PostRepositoryTests : IDisposable
{
    private readonly SqliteConnection _connection;
    private readonly DbContextOptions<AppDbContext> _options;

    public PostRepositoryTests()
    {
        // Setup SQLite in-memory connection
        _connection = new SqliteConnection("Filename=:memory:;Foreign Keys=False");
        _connection.Open();

        _options = new DbContextOptionsBuilder<AppDbContext>()
            .UseSqlite(_connection)
            .Options;

        // Initialize database schema
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
    public async Task GetFilteredAsync_FiltersByWorkspaceId()
    {
        // Arrange
        var workspaceId = Guid.NewGuid();
        var otherWorkspaceId = Guid.NewGuid();
        using var context = CreateContext();
        
        context.Posts.Add(Post.Create(workspaceId, Guid.NewGuid(), "Post 1", "Content"));
        context.Posts.Add(Post.Create(otherWorkspaceId, Guid.NewGuid(), "Other Post", "Content"));
        await context.SaveChangesAsync();

        var sut = new PostRepository(context);

        // Act
        var (items, totalCount) = await sut.GetFilteredAsync(workspaceId);

        // Assert
        Assert.Single(items);
        Assert.Equal(1, totalCount);
    }

    [Fact]
    public async Task GetFilteredAsync_FiltersByStatus()
    {
        // Arrange
        var workspaceId = Guid.NewGuid();
        using var context = CreateContext();
        
        var scheduledPost = Post.Create(workspaceId, Guid.NewGuid(), "Scheduled", "Content", DateTime.UtcNow.AddDays(1));
        var draftPost = Post.Create(workspaceId, Guid.NewGuid(), "Draft", "Content");
        
        context.Posts.AddRange(scheduledPost, draftPost);
        await context.SaveChangesAsync();

        var sut = new PostRepository(context);

        // Act
        var (items, totalCount) = await sut.GetFilteredAsync(workspaceId, status: PostStatus.Scheduled);

        // Assert
        Assert.Single(items);
        Assert.Equal(PostStatus.Scheduled, items[0].Status);
        Assert.Equal(1, totalCount);
    }

    [Fact]
    public async Task GetFilteredAsync_FiltersByDateRange()
    {
        // Arrange
        var workspaceId = Guid.NewGuid();
        using var context = CreateContext();
        var now = DateTime.UtcNow;
        
        // Post.Create sets status to Scheduled if date is in future, else Draft
        var pastPost = Post.Create(workspaceId, Guid.NewGuid(), "Past", "Content", now.AddDays(-5));
        var presentPost = Post.Create(workspaceId, Guid.NewGuid(), "Present", "Content", now.AddDays(1));
        var futurePost = Post.Create(workspaceId, Guid.NewGuid(), "Future", "Content", now.AddDays(5));
        
        context.Posts.AddRange(pastPost, presentPost, futurePost);
        await context.SaveChangesAsync();

        var sut = new PostRepository(context);

        // Act
        var (items, totalCount) = await sut.GetFilteredAsync(
            workspaceId, 
            scheduledFromUtc: now, 
            scheduledToUtc: now.AddDays(2));

        // Assert
        Assert.Single(items);
        Assert.Equal("Present", items[0].Title.Value);
        Assert.Equal(1, totalCount);
    }

    [Fact]
    public async Task GetFilteredAsync_PaginationWorks()
    {
        // Arrange
        var workspaceId = Guid.NewGuid();
        using var context = CreateContext();
        
        for (int i = 1; i <= 25; i++)
        {
            context.Posts.Add(Post.Create(workspaceId, Guid.NewGuid(), $"Post {i:D2}", "Content"));
        }
        await context.SaveChangesAsync();

        var sut = new PostRepository(context);

        // Act
        var (items, totalCount) = await sut.GetFilteredAsync(workspaceId, page: 2, pageSize: 10);

        // Assert
        Assert.Equal(10, items.Count);
        Assert.Equal(25, totalCount);
    }

    [Fact]
    public async Task GetFilteredAsync_CombinedFiltering()
    {
        // Arrange
        var workspaceId = Guid.NewGuid();
        using var context = CreateContext();
        var now = DateTime.UtcNow;
        
        var post1 = Post.Create(workspaceId, Guid.NewGuid(), "Match", "Content", now.AddDays(1));
        var post2 = Post.Create(workspaceId, Guid.NewGuid(), "No Status Match", "Content"); // Defaults to Draft
        
        var post3 = Post.Create(workspaceId, Guid.NewGuid(), "No Date Match", "Content", now.AddDays(5));
        
        context.Posts.AddRange(post1, post2, post3);
        await context.SaveChangesAsync();

        var sut = new PostRepository(context);

        // Act
        var (items, totalCount) = await sut.GetFilteredAsync(
            workspaceId, 
            status: PostStatus.Scheduled,
            scheduledFromUtc: now, 
            scheduledToUtc: now.AddDays(2));

        // Assert
        Assert.Single(items);
        Assert.Equal("Match", items[0].Title.Value);
        Assert.Equal(PostStatus.Scheduled, items[0].Status);
        Assert.Equal(1, totalCount);
    }
}
