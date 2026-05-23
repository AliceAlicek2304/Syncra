using System.Reflection;
using Syncra.Application.DTOs.Zernio;
using Xunit;

namespace Syncra.UnitTests.Application.Zernio;

public class ZernioDtosTests
{
    [Fact]
    public void ZernioCreatePostPlatformTarget_ShouldBeDefined()
    {
        // Arrange
        var type = typeof(ZernioCreatePostPlatformTarget);

        // Act
        var platformProp = type.GetProperty("Platform");
        var accountIdProp = type.GetProperty("ZernioAccountId");

        // Assert
        Assert.NotNull(type);
        Assert.NotNull(platformProp);
        Assert.NotNull(accountIdProp);
        Assert.True(platformProp!.PropertyType == typeof(string));
        Assert.True(accountIdProp!.PropertyType == typeof(string));
    }

    [Fact]
    public void ZernioCreatePostRequest_ShouldBeDefined()
    {
        // Arrange
        var type = typeof(ZernioCreatePostRequest);

        // Act
        var contentProp = type.GetProperty("Content");
        var platformsProp = type.GetProperty("Platforms");
        var scheduledForProp = type.GetProperty("ScheduledForUtc");
        var publishNowProp = type.GetProperty("PublishNow");

        // Assert
        Assert.NotNull(type);
        Assert.NotNull(contentProp);
        Assert.NotNull(platformsProp);
        Assert.NotNull(scheduledForProp);
        Assert.NotNull(publishNowProp);
        Assert.True(contentProp!.PropertyType == typeof(string));
        Assert.True(platformsProp!.PropertyType == typeof(IReadOnlyList<ZernioCreatePostPlatformTarget>));
        Assert.True(scheduledForProp!.PropertyType == typeof(DateTime?));
        Assert.True(publishNowProp!.PropertyType == typeof(bool));
    }

    [Fact]
    public void ZernioCreatePostResult_ShouldBeDefined()
    {
        // Arrange
        var type = typeof(ZernioCreatePostResult);

        // Act
        var zernioPostIdProp = type.GetProperty("ZernioPostId");
        var statusProp = type.GetProperty("Status");
        var targetCountProp = type.GetProperty("TargetCount");

        // Assert
        Assert.NotNull(type);
        Assert.NotNull(zernioPostIdProp);
        Assert.NotNull(statusProp);
        Assert.NotNull(targetCountProp);
        Assert.True(zernioPostIdProp!.PropertyType == typeof(string));
        Assert.True(statusProp!.PropertyType == typeof(string));
        Assert.True(targetCountProp!.PropertyType == typeof(int));
    }
}
