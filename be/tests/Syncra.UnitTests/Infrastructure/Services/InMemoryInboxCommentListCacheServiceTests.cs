using FluentAssertions;
using Syncra.Application.DTOs.Inbox;
using Syncra.Infrastructure.Services;
using Xunit;

namespace Syncra.UnitTests.Infrastructure.Services;

/// <summary>
/// Tests for <see cref="InMemoryInboxCommentListCacheService"/>.
/// Covers the D-15 hybrid list cache: hit, miss, TTL eviction,
/// and key isolation across distinct filter sets.
/// </summary>
public class InMemoryInboxCommentListCacheServiceTests
{
    private readonly InMemoryInboxCommentListCacheService _sut = new();
    private readonly Guid _workspaceId = Guid.NewGuid();

    private static ZernioInboxCommentsPageDto BuildPage(string id) => new(
        Items: new List<ZernioInboxCommentItemDto>
        {
            new(id, "facebook", $"body-{id}", null, null, DateTime.UtcNow, 1, null)
        },
        HasMore: false,
        NextCursor: null);

    [Fact]
    public async Task GetAsync_OnMiss_ReturnsNull()
    {
        var result = await _sut.GetAsync(
            _workspaceId, cursor: null, minComments: null, since: null,
            sortBy: null, sortOrder: null, platform: null, accountId: null);

        result.Should().BeNull();
    }

    [Fact]
    public async Task SetAsync_ThenGetAsync_ReturnsCachedPage()
    {
        var page = BuildPage("post-1");

        await _sut.SetAsync(
            _workspaceId, page,
            cursor: null, minComments: null, since: null,
            sortBy: null, sortOrder: null, platform: null, accountId: null,
            ttl: TimeSpan.FromMinutes(5));

        var result = await _sut.GetAsync(
            _workspaceId, cursor: null, minComments: null, since: null,
            sortBy: null, sortOrder: null, platform: null, accountId: null);

        result.Should().BeSameAs(page);
    }

    [Fact]
    public async Task GetAsync_AfterTtl_ReturnsNull()
    {
        var page = BuildPage("post-1");

        await _sut.SetAsync(
            _workspaceId, page,
            cursor: null, minComments: 5, since: null,
            sortBy: null, sortOrder: null, platform: "facebook", accountId: null,
            ttl: TimeSpan.FromMilliseconds(50));

        await Task.Delay(150);

        var result = await _sut.GetAsync(
            _workspaceId, cursor: null, minComments: 5, since: null,
            sortBy: null, sortOrder: null, platform: "facebook", accountId: null);

        result.Should().BeNull();
    }

    [Fact]
    public async Task GetAsync_DistinctFilterSets_AreIsolated()
    {
        var pageA = BuildPage("post-A");
        var pageB = BuildPage("post-B");

        await _sut.SetAsync(
            _workspaceId, pageA,
            cursor: null, minComments: 1, since: null,
            sortBy: null, sortOrder: null, platform: "facebook", accountId: null,
            ttl: TimeSpan.FromMinutes(5));

        await _sut.SetAsync(
            _workspaceId, pageB,
            cursor: "cursor-1", minComments: 1, since: null,
            sortBy: null, sortOrder: null, platform: "facebook", accountId: null,
            ttl: TimeSpan.FromMinutes(5));

        var resultA = await _sut.GetAsync(
            _workspaceId, cursor: null, minComments: 1, since: null,
            sortBy: null, sortOrder: null, platform: "facebook", accountId: null);

        var resultB = await _sut.GetAsync(
            _workspaceId, cursor: "cursor-1", minComments: 1, since: null,
            sortBy: null, sortOrder: null, platform: "facebook", accountId: null);

        resultA.Should().BeSameAs(pageA);
        resultB.Should().BeSameAs(pageB);
    }

    [Fact]
    public async Task GetAsync_DistinctWorkspaces_AreIsolated()
    {
        var otherWorkspace = Guid.NewGuid();
        var pageA = BuildPage("post-A");
        var pageB = BuildPage("post-B");

        await _sut.SetAsync(
            _workspaceId, pageA,
            cursor: null, minComments: null, since: null,
            sortBy: null, sortOrder: null, platform: null, accountId: null,
            ttl: TimeSpan.FromMinutes(5));

        await _sut.SetAsync(
            otherWorkspace, pageB,
            cursor: null, minComments: null, since: null,
            sortBy: null, sortOrder: null, platform: null, accountId: null,
            ttl: TimeSpan.FromMinutes(5));

        var resultA = await _sut.GetAsync(
            _workspaceId, cursor: null, minComments: null, since: null,
            sortBy: null, sortOrder: null, platform: null, accountId: null);

        var resultB = await _sut.GetAsync(
            otherWorkspace, cursor: null, minComments: null, since: null,
            sortBy: null, sortOrder: null, platform: null, accountId: null);

        resultA.Should().BeSameAs(pageA);
        resultB.Should().BeSameAs(pageB);
    }

    [Fact]
    public async Task GetAsync_OnExpiredEntry_RemovesIt()
    {
        var page = BuildPage("post-1");

        await _sut.SetAsync(
            _workspaceId, page,
            cursor: null, minComments: null, since: null,
            sortBy: null, sortOrder: null, platform: null, accountId: null,
            ttl: TimeSpan.FromMilliseconds(1));

        await Task.Delay(20);

        var firstResult = await _sut.GetAsync(
            _workspaceId, cursor: null, minComments: null, since: null,
            sortBy: null, sortOrder: null, platform: null, accountId: null);

        var secondResult = await _sut.GetAsync(
            _workspaceId, cursor: null, minComments: null, since: null,
            sortBy: null, sortOrder: null, platform: null, accountId: null);

        firstResult.Should().BeNull();
        secondResult.Should().BeNull();
    }
}
