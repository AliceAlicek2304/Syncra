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
        
        var storageServiceMock = new Mock<IStorageService>();
        storageServiceMock.Setup(s => s.OpenReadAsync(It.IsAny<string>()))
            .ReturnsAsync(new System.IO.MemoryStream());
        var wasabiOptionsMock = new Mock<Microsoft.Extensions.Options.IOptions<Syncra.Application.Options.WasabiOptions>>();
        wasabiOptionsMock.Setup(o => o.Value).Returns(new Syncra.Application.Options.WasabiOptions
        {
            BucketName = "test-bucket",
            ServiceUrl = "https://s3.wasabi.com"
        });

        _handler = new CreateZernioPostCommandHandler(
            _zernioClientMock.Object,
            _socialAccountRepository,
            _zernioProfileRepository,
            postRepository,
            _unitOfWork,
            storageServiceMock.Object,
            wasabiOptionsMock.Object);
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

        var dummyRequest = new ZernioCreatePostRequest(
            Title: "Test Title",
            Content: "Test Content",
            Platforms: Array.Empty<ZernioCreatePostPlatformTarget>(),
            ScheduledForUtc: null,
            PublishNow: true,
            IsDraft: false,
            MediaItems: null,
            PlatformContents: null
        );

        var platforms = new[]
        {
            "bluesky", "facebook", "google", "googlebusiness", "instagram", "linkedin",
            "pinterest", "reddit", "snapchat", "telegram", "threads", "tiktok",
            "twitter", "x", "youtube", "discord", "", "   ", "invalid_platform"
        };

        foreach (var platform in platforms)
        {
            var result = method.Invoke(null, new object?[] { platform, dummyRequest });
            var expectedNull = platform.ToLowerInvariant() switch
            {
                "pinterest" or "youtube" or "reddit" or "facebook" or "instagram" or "linkedin" => false,
                _ => true
            };

            if (expectedNull)
            {
                Assert.Null(result);
            }
            else
            {
                Assert.NotNull(result);
            }
        }
    }

    [Fact]
    public async Task Handler_WithMediaItemsNullOrGenericMimeType_ResolvesMimeTypeFromExtension()
    {
        // Arrange
        var account1 = await SeedSocialAccountAsync(_workspaceId, "twitter", "acc_twitter_1");

        _zernioClientMock
            .Setup(x => x.CreatePostAsync(It.IsAny<ZernioCreatePostRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ZernioCreatePostResult("zernio_post_media", "scheduled", 1));

        _zernioClientMock
            .Setup(x => x.GetMediaPresignedUrlAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ZernioPresignResponse("https://presigned.url/upload", "https://zernio.com/public/media.png"));

        _zernioClientMock
            .Setup(x => x.UploadMediaToZernioAsync(It.IsAny<string>(), It.IsAny<System.IO.Stream>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync("https://zernio.com/public/media.png");

        var mediaItem = new PostMediaItemDto(
            Url: "https://s3.wasabi.com/test-bucket/media.png",
            Type: "image",
            Filename: "media.png",
            MimeType: null // Null mime type should trigger guessing logic
        );

        var command = new CreateZernioPostCommand(
            _workspaceId,
            _userId,
            "Post with Media",
            "Content",
            new List<Guid> { account1.Id },
            ScheduledAtUtc: DateTime.UtcNow.AddHours(2),
            PublishNow: false,
            IsDraft: false,
            MediaItems: new List<PostMediaItemDto> { mediaItem },
            PlatformContents: null);

        // Act
        var result = await _handler.Handle(command, CancellationToken.None);

        // Assert
        Assert.NotNull(result);
        _zernioClientMock.Verify(x => x.UploadMediaToZernioAsync(
            It.IsAny<string>(),
            It.IsAny<System.IO.Stream>(),
            "image/png", // Should be resolved from "media.png" extension
            It.IsAny<CancellationToken>()
        ), Times.Once);
    }

    [Fact]
    public async Task Handler_WithZernioMediaUrl_DoesNotReuploadToZernio()
    {
        // Arrange
        var account1 = await SeedSocialAccountAsync(_workspaceId, "twitter", "acc_twitter_1");

        _zernioClientMock
            .Setup(x => x.CreatePostAsync(It.IsAny<ZernioCreatePostRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ZernioCreatePostResult("zernio_post_media", "scheduled", 1));

        var zernioMediaUrl = "https://media.zernio.com/temp/123_dog.jpg";
        var mediaItem = new PostMediaItemDto(
            Url: zernioMediaUrl,
            Type: "image",
            Filename: "dog.jpg",
            MimeType: "image/jpeg"
        );

        var command = new CreateZernioPostCommand(
            _workspaceId,
            _userId,
            "Post with Media",
            "Content",
            new List<Guid> { account1.Id },
            ScheduledAtUtc: DateTime.UtcNow.AddHours(2),
            PublishNow: false,
            IsDraft: false,
            MediaItems: new List<PostMediaItemDto> { mediaItem },
            PlatformContents: null);

        // Act
        var result = await _handler.Handle(command, CancellationToken.None);

        // Assert
        Assert.NotNull(result);
        
        // Verify that UploadMediaToZernioAsync is NEVER called because the file is already on Zernio
        _zernioClientMock.Verify(x => x.UploadMediaToZernioAsync(
            It.IsAny<string>(),
            It.IsAny<System.IO.Stream>(),
            It.IsAny<string>(),
            It.IsAny<CancellationToken>()
        ), Times.Never);
        _zernioClientMock.Verify(x => x.GetMediaPresignedUrlAsync(
            It.IsAny<string>(),
            It.IsAny<string>(),
            It.IsAny<CancellationToken>()
        ), Times.Never);
    }

    [Fact]
    public void TestPlatformSpecificMediaFiltering()
    {
        var method = typeof(Syncra.Infrastructure.Services.ZernioClient)
            .GetMethod("FilterMediaForPlatform", System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Static);

        Assert.NotNull(method);

        var mediaItems = new List<PostMediaItemDto>
        {
            new PostMediaItemDto("https://test.com/img.png", "image", "img.png", "image/png"),
            new PostMediaItemDto("https://test.com/vid.mp4", "video", "vid.mp4", "video/mp4")
        };

        // 1. YouTube should only return video
        var youtubeResult = method.Invoke(null, new object?[] { "youtube", mediaItems }) as System.Collections.IList;
        Assert.NotNull(youtubeResult);
        Assert.Single(youtubeResult);
        var ytItem = youtubeResult[0];
        Assert.NotNull(ytItem);
        var ytTypeProp = ytItem.GetType().GetProperty("type");
        Assert.NotNull(ytTypeProp);
        Assert.Equal("video", ytTypeProp.GetValue(ytItem));

        // 2. Google Business Profile should only return image
        var gmbResult = method.Invoke(null, new object?[] { "googlebusiness", mediaItems }) as System.Collections.IList;
        Assert.NotNull(gmbResult);
        Assert.Single(gmbResult);
        var gmbItem = gmbResult[0];
        Assert.NotNull(gmbItem);
        var gmbTypeProp = gmbItem.GetType().GetProperty("type");
        Assert.NotNull(gmbTypeProp);
        Assert.Equal("image", gmbTypeProp.GetValue(gmbItem));

        // 3. Facebook should return both
        var fbResult = method.Invoke(null, new object?[] { "facebook", mediaItems }) as System.Collections.IList;
        Assert.NotNull(fbResult);
        Assert.Equal(2, fbResult.Count);

        // 4. Null media items should return null
        var nullResult = method.Invoke(null, new object?[] { "facebook", null });
        Assert.Null(nullResult);
    }

}

