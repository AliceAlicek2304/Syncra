using Moq;
using Syncra.Application.Features.Posts.Queries;
using Syncra.Domain.Interfaces;
using Syncra.Domain.Entities;
using Syncra.Domain.Enums;
using Syncra.Application.Interfaces;
using Syncra.Application.DTOs.Zernio;
using Xunit;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace Syncra.UnitTests.Application.Posts;

public class GetPostsQueryHandlerTests
{
    private readonly Mock<IZernioClient> _zernioClientMock;
    private readonly Mock<IZernioProfileRepository> _zernioProfileRepositoryMock;
    private readonly Mock<IStorageService> _storageServiceMock;
    private readonly Mock<IPostRepository> _postRepositoryMock;
    private readonly GetPostsQueryHandler _handler;

    public GetPostsQueryHandlerTests()
    {
        _zernioClientMock = new Mock<IZernioClient>();
        _zernioProfileRepositoryMock = new Mock<IZernioProfileRepository>();
        _storageServiceMock = new Mock<IStorageService>();
        _postRepositoryMock = new Mock<IPostRepository>();

        _handler = new GetPostsQueryHandler(
            _zernioClientMock.Object,
            _zernioProfileRepositoryMock.Object,
            _storageServiceMock.Object,
            _postRepositoryMock.Object);
    }

    [Fact]
    public async Task Handle_SingleProfile_FiltersZernioPostsByLocalDbPresence()
    {
        // Arrange
        var workspaceId = Guid.NewGuid();
        var profileId = Guid.NewGuid();
        var zernioProfileId = "zp-123";

        var profile = ZernioProfile.Create(workspaceId, zernioProfileId, "Profile 1", "facebook");
        
        var query = new GetPostsQuery(
            WorkspaceId: workspaceId,
            ProfileId: profileId,
            Status: null,
            ScheduledFromUtc: null,
            ScheduledToUtc: null,
            Page: 1,
            PageSize: 10);

        _zernioProfileRepositoryMock.Setup(r => r.GetByIdAsync(profileId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(profile);

        // Zernio returns 2 posts
        var zernioPosts = new List<ZernioPostListItemDto>
        {
            new ZernioPostListItemDto(
                Id: "zpost-1",
                Title: "Title 1",
                Content: "Content 1",
                Status: "published",
                ScheduledFor: null,
                Timezone: "UTC",
                Platforms: [],
                Tags: [],
                ZernioMediaItems: [],
                CreatedAt: DateTime.UtcNow,
                UpdatedAt: DateTime.UtcNow,
                PublishedAt: DateTime.UtcNow),
            new ZernioPostListItemDto(
                Id: "zpost-2",
                Title: "Title 2",
                Content: "Content 2",
                Status: "published",
                ScheduledFor: null,
                Timezone: "UTC",
                Platforms: [],
                Tags: [],
                ZernioMediaItems: [],
                CreatedAt: DateTime.UtcNow,
                UpdatedAt: DateTime.UtcNow,
                PublishedAt: DateTime.UtcNow)
        };

        var zernioResponse = new ZernioPostListResponseDto(
            Posts: zernioPosts,
            Page: 1,
            Limit: 10,
            Total: 2,
            Pages: 1);

        _zernioClientMock.Setup(c => c.ListPostsAsync(
            It.IsAny<int?>(), It.IsAny<int?>(), It.IsAny<string?>(), It.IsAny<string?>(),
            It.IsAny<string?>(), It.IsAny<string?>(), It.IsAny<string?>(), zernioProfileId,
            It.IsAny<DateTime?>(), It.IsAny<DateTime?>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(zernioResponse);

        // Local DB only has 1 post (zpost-1)
        var localPost = Post.Create(workspaceId, Guid.NewGuid(), "Title 1", "Content 1", null);
        localPost.AssignZernioPost("zpost-1", 1);

        _postRepositoryMock.Setup(r => r.GetByWorkspaceIdAsync(workspaceId))
            .ReturnsAsync(new List<Post> { localPost });

        // Act
        var result = await _handler.Handle(query, CancellationToken.None);

        // Assert
        Assert.Single(result.Items);
        Assert.Equal("zpost-1", result.Items[0].ZernioPostId);
        Assert.Equal(1, result.TotalItems);
    }

    [Fact]
    public async Task Handle_MultipleProfiles_FiltersAndMergesCorrectly()
    {
        // Arrange
        var workspaceId = Guid.NewGuid();
        var zernioProfileId1 = "zp-1";
        var zernioProfileId2 = "zp-2";

        var profile1 = ZernioProfile.Create(workspaceId, zernioProfileId1, "Profile 1", "facebook");
        var profile2 = ZernioProfile.Create(workspaceId, zernioProfileId2, "Profile 2", "instagram");

        var query = new GetPostsQuery(
            WorkspaceId: workspaceId,
            ProfileId: null,
            Status: null,
            ScheduledFromUtc: null,
            ScheduledToUtc: null,
            Page: 1,
            PageSize: 10);

        _zernioProfileRepositoryMock.Setup(r => r.GetActiveByWorkspaceIdAsync(workspaceId))
            .ReturnsAsync(new List<ZernioProfile> { profile1, profile2 });

        // Zernio returns posts for profile 1
        var zernioPosts1 = new List<ZernioPostListItemDto>
        {
            new ZernioPostListItemDto("zpost-1", "Title 1", "Content 1", "published", null, "UTC", [], [], [], DateTime.UtcNow, DateTime.UtcNow, DateTime.UtcNow)
        };
        var zernioResponse1 = new ZernioPostListResponseDto(zernioPosts1, 1, 10, 1, 1);

        // Zernio returns posts for profile 2
        var zernioPosts2 = new List<ZernioPostListItemDto>
        {
            new ZernioPostListItemDto("zpost-2", "Title 2", "Content 2", "published", null, "UTC", [], [], [], DateTime.UtcNow, DateTime.UtcNow, DateTime.UtcNow)
        };
        var zernioResponse2 = new ZernioPostListResponseDto(zernioPosts2, 1, 10, 1, 1);

        _zernioClientMock.Setup(c => c.ListPostsAsync(
            It.IsAny<int?>(), It.IsAny<int?>(), It.IsAny<string?>(), It.IsAny<string?>(),
            It.IsAny<string?>(), It.IsAny<string?>(), It.IsAny<string?>(), zernioProfileId1,
            It.IsAny<DateTime?>(), It.IsAny<DateTime?>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(zernioResponse1);

        _zernioClientMock.Setup(c => c.ListPostsAsync(
            It.IsAny<int?>(), It.IsAny<int?>(), It.IsAny<string?>(), It.IsAny<string?>(),
            It.IsAny<string?>(), It.IsAny<string?>(), It.IsAny<string?>(), zernioProfileId2,
            It.IsAny<DateTime?>(), It.IsAny<DateTime?>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(zernioResponse2);

        // Local DB only has 1 post (zpost-2)
        var localPost = Post.Create(workspaceId, Guid.NewGuid(), "Title 2", "Content 2", null);
        localPost.AssignZernioPost("zpost-2", 1);

        _postRepositoryMock.Setup(r => r.GetByWorkspaceIdAsync(workspaceId))
            .ReturnsAsync(new List<Post> { localPost });

        // Act
        var result = await _handler.Handle(query, CancellationToken.None);

        // Assert
        Assert.Single(result.Items);
        Assert.Equal("zpost-2", result.Items[0].ZernioPostId);
        Assert.Equal(1, result.TotalItems);
    }
}
