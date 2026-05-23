using Syncra.Domain.Entities;
using Syncra.Domain.Enums;
using Xunit;

namespace Syncra.UnitTests.Domain;

public class PostPlatformTargetTests
{
    private readonly Guid _workspaceId = Guid.NewGuid();
    private readonly Guid _postId = Guid.NewGuid();

    [Fact]
    public void Create_ZernioAccountId_ShouldBeNullByDefault()
    {
        // Act
        var target = PostPlatformTarget.Create(_workspaceId, _postId, "twitter");

        // Assert
        Assert.Null(target.ZernioAccountId);
    }

    [Fact]
    public void SetZernioAccountId_ShouldSetValue()
    {
        // Arrange
        var target = PostPlatformTarget.Create(_workspaceId, _postId, "twitter");
        const string accountId = "acc_abc123";

        // Act
        target.SetZernioAccountId(accountId);

        // Assert
        Assert.Equal(accountId, target.ZernioAccountId);
    }

    [Fact]
    public void SetZernioAccountId_ShouldUpdateUpdatedAtUtc()
    {
        // Arrange
        var target = PostPlatformTarget.Create(_workspaceId, _postId, "twitter");
        var originalUpdatedAt = target.UpdatedAtUtc;

        // Act
        target.SetZernioAccountId("acc_abc123");

        // Assert
        Assert.NotNull(target.UpdatedAtUtc);
        Assert.True(target.UpdatedAtUtc > originalUpdatedAt);
    }

    [Fact]
    public void ZernioAccountIdMaxLength_ShouldBe200()
    {
        // Assert
        Assert.Equal(200, PostPlatformTarget.ZernioAccountIdMaxLength);
    }

    [Fact]
    public void ZernioAccountId_ShouldMatchSocialAccountExternalAccountIdMaxLength()
    {
        // Assert
        Assert.Equal(SocialAccount.ExternalAccountIdMaxLength, PostPlatformTarget.ZernioAccountIdMaxLength);
    }
}
