using Microsoft.EntityFrameworkCore;
using Moq;
using Syncra.Application.DTOs.Posts;
using Syncra.Application.DTOs.Zernio;
using Syncra.Application.Features.Posts.CreateZernioPost;
using Syncra.Application.Interfaces;
using Syncra.Domain.Entities;
using Syncra.Domain.Exceptions;
using Syncra.Domain.Interfaces;
using Syncra.Infrastructure.Persistence;
using Syncra.Infrastructure.Repositories;
using Xunit;

namespace Syncra.UnitTests.Features.Posts;

[Trait("Category", "Post")]
public class CreateZernioPostCommandTests : IDisposable
{
    private readonly AppDbContext _db;
    private readonly Mock<IZernioClient> _zernioClientMock;
    private readonly IUnitOfWork _unitOfWork;
    private readonly ISocialAccountRepository _socialAccountRepository;
    private readonly IZernioProfileRepository _zernioProfileRepository;
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
        _unitOfWork = new UnitOfWork(_db);
        _socialAccountRepository = new SocialAccountRepository(_db);
        _zernioProfileRepository = new ZernioProfileRepository(_db);

        var postRepository = new PostRepository(_db);

        _handler = new CreateZernioPostCommandHandler(
            _zernioClientMock.Object,
            _socialAccountRepository,
            _zernioProfileRepository,
            postRepository,
            _unitOfWork);
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
            profile = ZernioProfile.Create(
                workspaceId,
                "zernio_profile_1",
                "Test Profile",
                "all");
            _db.ZernioProfiles.Add(profile);
            await _db.SaveChangesAsync();
        }

        var account = SocialAccount.Create(
            workspaceId,
            profile.Id,
            externalAccountId,
            platform,
            $"Test {platform} Account");

        _db.SocialAccounts.Add(account);
        await _db.SaveChangesAsync();

        if (!isActive)
        {
            account.Deactivate();
            await _db.SaveChangesAsync();
        }

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

        var command = new CreateZernioPostCommand(
            _workspaceId,
            _userId,
            "Test Post Title",
            "Test post content for Zernio",
            new List<Guid> { account1.Id, account2.Id },
            ScheduledAtUtc: DateTime.UtcNow.AddHours(2),
            PublishNow: false,
            IsDraft: false,
            MediaItems: null,
            PlatformContents: null);

        // Act
        var result = await _handler.Handle(command, CancellationToken.None);

        // Assert
        Assert.NotNull(result);
        Assert.Equal("zernio_post_123", result.ZernioPostId);
        Assert.Equal(2, result.ZernioTargetCount);
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

        var command = new CreateZernioPostCommand(
            _workspaceId,
            _userId,
            "Immediate Post",
            "Content for immediate publish",
            new List<Guid> { account1.Id },
            ScheduledAtUtc: null,
            PublishNow: true,
            IsDraft: false,
            MediaItems: null,
            PlatformContents: null);

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
            ScheduledAtUtc: DateTime.UtcNow.AddHours(2),
            PublishNow: false,
            IsDraft: false,
            MediaItems: null,
            PlatformContents: null);

        // Act & Assert
        var exception = await Assert.ThrowsAsync<DomainException>(() =>
            _handler.Handle(command, CancellationToken.None));

        Assert.Equal("invalid_account", exception.Code);
    }

    [Fact]
    public async Task Handler_InactiveAccount_Throws()
    {
        // Arrange
        var inactiveAccount = await SeedSocialAccountAsync(_workspaceId, "twitter", "acc_inactive", isActive: false);

        var command = new CreateZernioPostCommand(
            _workspaceId,
            _userId,
            "Test",
            "Content",
            new List<Guid> { inactiveAccount.Id },
            ScheduledAtUtc: DateTime.UtcNow.AddHours(2),
            PublishNow: false,
            IsDraft: false,
            MediaItems: null,
            PlatformContents: null);

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
            ScheduledAtUtc: DateTime.UtcNow.AddHours(2),
            PublishNow: false,
            IsDraft: false,
            MediaItems: null,
            PlatformContents: null);

        // Act & Assert
        var exception = await Assert.ThrowsAsync<DomainException>(() =>
            _handler.Handle(command, CancellationToken.None));

        Assert.Equal("invalid_account", exception.Code);
    }

    [Fact]
    public async Task Handler_DraftNoSocialAccounts_Succeeds()
    {
        // Arrange
        var profile = ZernioProfile.Create(
            _workspaceId,
            "zernio_profile_1",
            "Test Profile",
            "all");
        _db.ZernioProfiles.Add(profile);
        await _db.SaveChangesAsync();

        _zernioClientMock
            .Setup(x => x.CreatePostAsync(It.IsAny<ZernioCreatePostRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ZernioCreatePostResult("zernio_post_draft", "draft", 0));

        var command = new CreateZernioPostCommand(
            _workspaceId,
            _userId,
            "Draft Title",
            "Draft Content",
            null,
            ScheduledAtUtc: null,
            PublishNow: false,
            IsDraft: true,
            MediaItems: null,
            PlatformContents: null);

        // Act
        var result = await _handler.Handle(command, CancellationToken.None);

        // Assert
        Assert.NotNull(result);
        Assert.Equal("zernio_post_draft", result.ZernioPostId);
        Assert.Equal(0, result.ZernioTargetCount);
    }

    [Fact]
    public void TestPlatformSpecificDataSerialization()
    {
        var method = typeof(Syncra.Infrastructure.Services.ZernioClient)
            .GetMethod("MapPlatformSpecificData", System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Static);

        Assert.NotNull(method);

        var testCases = new Dictionary<string, Type>
        {
            { "bluesky", typeof(Zernio.Model.BlueskyPlatformData) },
            { "facebook", typeof(Zernio.Model.FacebookPlatformData) },
            { "google", typeof(Zernio.Model.GoogleBusinessPlatformData) },
            { "googlebusiness", typeof(Zernio.Model.GoogleBusinessPlatformData) },
            { "instagram", typeof(Zernio.Model.InstagramPlatformData) },
            { "linkedin", typeof(Zernio.Model.LinkedInPlatformData) },
            { "pinterest", typeof(Zernio.Model.PinterestPlatformData) },
            { "reddit", typeof(Zernio.Model.RedditPlatformData) },
            { "snapchat", typeof(Zernio.Model.SnapchatPlatformData) },
            { "telegram", typeof(Zernio.Model.TelegramPlatformData) },
            { "threads", typeof(Zernio.Model.ThreadsPlatformData) },
            { "tiktok", typeof(Zernio.Model.TikTokPlatformData) },
            { "twitter", typeof(Zernio.Model.TwitterPlatformData) },
            { "x", typeof(Zernio.Model.TwitterPlatformData) },
            { "youtube", typeof(Zernio.Model.YouTubePlatformData) },
            { "discord", typeof(Zernio.Model.DiscordPlatformData) }
        };

        foreach (var (platform, expectedType) in testCases)
        {
            var result = (Zernio.Model.CreatePostRequestPlatformsInnerPlatformSpecificData?)method.Invoke(null, new object[] { platform });
            Assert.NotNull(result);
            Assert.Equal(expectedType, result.ActualInstance.GetType());
        }

        // Test null/empty/invalid
        Assert.Null(method.Invoke(null, new object[] { "" }));
        Assert.Null(method.Invoke(null, new object[] { "   " }));
        Assert.Null(method.Invoke(null, new object[] { "invalid_platform" }));
    }
}
