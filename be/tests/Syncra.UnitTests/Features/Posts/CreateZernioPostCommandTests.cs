using Microsoft.EntityFrameworkCore;
using Moq;
using Syncra.Application.DTOs.Posts;
using Syncra.Application.DTOs.Zernio;
using Syncra.Application.Features.Posts.CreateZernioPost;
using Syncra.Application.Interfaces;
using Syncra.Domain.Entities;
using Syncra.Domain.Enums;
using Syncra.Domain.Exceptions;
using Syncra.Domain.Interfaces;
using Syncra.Infrastructure.Persistence;
using Xunit;

namespace Syncra.UnitTests.Features.Posts;

[Trait("Category", "Post")]
public class CreateZernioPostCommandTests : IDisposable
{
    private readonly AppDbContext _db;
    private readonly Mock<IZernioClient> _zernioClientMock;
    private readonly Mock<IUnitOfWork> _unitOfWorkMock;
    private readonly CreateZernioPostCommandHandler _handler;
    private readonly Guid _workspaceId;
    private readonly Guid _userId;

    public CreateZernioPostCommandTests()
    {
        _workspaceId = Guid.NewGuid();
        _userId = Guid.NewGuid();

        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        _db = new AppDbContext(options);
        _zernioClientMock = new Mock<IZernioClient>();
        _unitOfWorkMock = new Mock<IUnitOfWork>();

        _handler = new CreateZernioPostCommandHandler(
            _zernioClientMock.Object,
            _db,
            _unitOfWorkMock.Object);
    }

    public void Dispose()
    {
        _db.Dispose();
    }

    private async Task<SocialAccount> SeedSocialAccountAsync(
        Guid workspaceId,
        string platform = "twitter",
        string externalAccountId = "acc_abc123",
        bool isActive = true)
    {
        // Need a ZernioProfile for the workspace
        var profile = await _db.ZernioProfiles.FirstOrDefaultAsync(p => p.WorkspaceId == workspaceId);
        if (profile is null)
        {
            profile = new ZernioProfile
            {
                WorkspaceId = workspaceId,
                ZernioProfileId = "zernio_profile_1",
                DisplayName = "Test Profile",
                Platform = "all",
                IsActive = true
            };
            _db.ZernioProfiles.Add(profile);
            await _db.SaveChangesAsync();
        }

        var account = new SocialAccount
        {
            WorkspaceId = workspaceId,
            ZernioProfileId = profile.Id,
            ExternalAccountId = externalAccountId,
            Platform = platform,
            DisplayName = $"Test {platform} Account",
            IsActive = isActive
        };

        _db.SocialAccounts.Add(account);
        await _db.SaveChangesAsync();
        return account;
    }

    [Fact]
    public async Task Handler_ValidWorkspaceAndAccounts_CreatesPostAndTargets()
    {
        // Arrange
        var account1 = await SeedSocialAccountAsync(_workspaceId, "twitter", "acc_twitter_1");
        var account2 = await SeedSocialAccountAsync(_workspaceId, "instagram", "acc_instagram_1");

        _zernioClientMock
            .Setup(x => x.CreatePostAsync(It.IsAny<ZernioCreatePostRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ZernioCreatePostResult("zernio_post_123", "scheduled", 2));

        _unitOfWorkMock
            .Setup(u => u.SaveChangesAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(1);

        var command = new CreateZernioPostCommand(
            _workspaceId,
            _userId,
            "Test Post Title",
            "Test post content for Zernio",
            new List<Guid> { account1.Id, account2.Id },
            scheduledAtUtc: DateTime.UtcNow.AddHours(2),
            publishNow: false);

        // Act
        var result = await _handler.Handle(command, CancellationToken.None);

        // Assert
        Assert.NotNull(result);
        Assert.Equal("zernio_post_123", result.ZernioPostId);
        Assert.Equal(2, result.ZernioTargetCount);
        Assert.Equal("Scheduled", result.Status);
        Assert.NotNull(result.PlatformTargets);
        Assert.Equal(2, result.PlatformTargets.Count);

        // Verify the post was persisted
        var savedPost = await _db.Posts
            .Include(p => p.PlatformTargets)
            .FirstOrDefaultAsync(p => p.Id == result.Id);
        Assert.NotNull(savedPost);
        Assert.Equal("zernio_post_123", savedPost!.ZernioPostId);
        Assert.Equal(2, savedPost.ZernioTargetCount);
        Assert.Equal(2, savedPost.PlatformTargets.Count);
        Assert.Contains(savedPost.PlatformTargets, t => t.ZernioAccountId == "acc_twitter_1");
        Assert.Contains(savedPost.PlatformTargets, t => t.ZernioAccountId == "acc_instagram_1");
    }

    [Fact]
    public async Task Handler_PublishNowTrue_TransitionsToPublishing()
    {
        // Arrange
        var account1 = await SeedSocialAccountAsync(_workspaceId, "twitter", "acc_twitter_1");

        _zernioClientMock
            .Setup(x => x.CreatePostAsync(It.IsAny<ZernioCreatePostRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ZernioCreatePostResult("zernio_post_456", "publishing", 1));

        _unitOfWorkMock
            .Setup(u => u.SaveChangesAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(1);

        var command = new CreateZernioPostCommand(
            _workspaceId,
            _userId,
            "Immediate Post",
            "Content for immediate publish",
            new List<Guid> { account1.Id },
            scheduledAtUtc: null,
            publishNow: true);

        // Act
        var result = await _handler.Handle(command, CancellationToken.None);

        // Assert
        Assert.NotNull(result);
        Assert.Equal("Publishing", result.Status);
    }

    [Fact]
    public async Task Handler_AccountFromAnotherWorkspace_Throws()
    {
        // Arrange
        var otherWorkspaceId = Guid.NewGuid();
        var accountFromOtherWorkspace = await SeedSocialAccountAsync(otherWorkspaceId, "twitter", "acc_other");

        var command = new CreateZernioPostCommand(
            _workspaceId,
            _userId,
            "Test",
            "Content",
            new List<Guid> { accountFromOtherWorkspace.Id },
            scheduledAtUtc: DateTime.UtcNow.AddHours(2),
            publishNow: false);

        // Act & Assert
        var exception = await Assert.ThrowsAsync<DomainException>(() =>
            _handler.Handle(command, CancellationToken.None));

        Assert.Equal("invalid_account", exception.Code);
    }

    [Fact]
    public async Task Handler_NoSocialAccounts_Throws()
    {
        // Arrange
        var command = new CreateZernioPostCommand(
            _workspaceId,
            _userId,
            "Test",
            "Content",
            new List<Guid>(),
            scheduledAtUtc: DateTime.UtcNow.AddHours(2),
            publishNow: false);

        // Act & Assert
        var exception = await Assert.ThrowsAsync<DomainException>(() =>
            _handler.Handle(command, CancellationToken.None));

        Assert.Equal("invalid_account", exception.Code);
    }
}
