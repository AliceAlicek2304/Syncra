using System.Reflection;
using Syncra.Application.DTOs.Zernio;
using Syncra.Application.Interfaces;
using Xunit;

namespace Syncra.UnitTests.Application.Zernio;

public class ZernioClientInterfaceTests
{
    [Fact]
    public void IZernioClient_ShouldDeclareCreatePostAsync()
    {
        // Arrange
        var interfaceType = typeof(IZernioClient);
        var method = interfaceType.GetMethod("CreatePostAsync");

        // Assert
        Assert.NotNull(method);
        Assert.True(method!.ReturnType.IsGenericType);
        Assert.Equal(typeof(Task<>), method!.ReturnType.GetGenericTypeDefinition());
        Assert.Equal(typeof(ZernioCreatePostResult), method!.ReturnType.GenericTypeArguments[0]);

        var parameters = method.GetParameters();
        Assert.Contains(parameters, p => p.Name == "request" && p.ParameterType == typeof(ZernioCreatePostRequest));
        Assert.Contains(parameters, p => p.Name == "cancellationToken" && p.ParameterType == typeof(CancellationToken));
    }

    [Fact]
    public void IZernioClient_ShouldDeclarePostManagementMethods()
    {
        // Arrange
        var interfaceType = typeof(IZernioClient);
        var methods = interfaceType.GetMethods(BindingFlags.Instance | BindingFlags.Public | BindingFlags.DeclaredOnly);
        var methodNames = methods.Select(m => m.Name).ToHashSet();

        var expectedMethods = new[]
        {
            "GetConnectUrlAsync",
            "ListAccountsAsync",
            "DisconnectAccountAsync",
            "ProvisionProfileAsync",
            "ListSelectOptionsAsync",
            "SelectOptionAsync",
            "CreatePostAsync",
            "RetryPostAsync",
            "DeletePostAsync"
        };

        foreach (var name in expectedMethods)
        {
            Assert.Contains(name, methodNames);
        }
    }

    [Fact]
    public void IZernioClient_ShouldDeclareUploadMediaToZernioAsyncWithMimeType()
    {
        // Arrange
        var interfaceType = typeof(IZernioClient);
        var method = interfaceType.GetMethod("UploadMediaToZernioAsync");

        // Assert
        Assert.NotNull(method);
        Assert.Equal(typeof(Task<string>), method!.ReturnType);

        var parameters = method.GetParameters();
        Assert.Contains(parameters, p => p.Name == "uploadUrl" && p.ParameterType == typeof(string));
        Assert.Contains(parameters, p => p.Name == "content" && p.ParameterType == typeof(System.IO.Stream));
        Assert.Contains(parameters, p => p.Name == "mimeType" && p.ParameterType == typeof(string));
        Assert.Contains(parameters, p => p.Name == "cancellationToken" && p.ParameterType == typeof(CancellationToken));
    }

    [Fact]
    public void IZernioClient_ShouldDeclareGetPostAnalyticsAsyncWithAllSpecParams()
    {
        // Arrange
        var interfaceType = typeof(IZernioClient);
        var method = interfaceType.GetMethod("GetPostAnalyticsAsync");

        // Assert
        Assert.NotNull(method);
        Assert.Equal(typeof(Task<ZernioPostAnalyticsDto>), method!.ReturnType);

        var parameters = method.GetParameters();
        var byName = parameters.ToDictionary(p => p.Name!, p => p.ParameterType);

        Assert.Equal(typeof(string), byName["postId"]);
        Assert.Equal(typeof(string), byName["platform"]);
        Assert.Equal(typeof(string), byName["profileId"]);
        Assert.Equal(typeof(string), byName["accountId"]);
        Assert.Equal(typeof(string), byName["source"]);
        Assert.Equal(typeof(DateOnly?), byName["fromDate"]);
        Assert.Equal(typeof(DateOnly?), byName["toDate"]);
        Assert.Equal(typeof(int?), byName["limit"]);
        Assert.Equal(typeof(int?), byName["page"]);
        Assert.Equal(typeof(string), byName["sortBy"]);
        Assert.Equal(typeof(string), byName["order"]);
        Assert.Equal(typeof(CancellationToken), byName["cancellationToken"]);
    }

    [Fact]
    public void IZernioClient_ShouldDeclareGetAnalyticsListAsync()
    {
        // Arrange
        var interfaceType = typeof(IZernioClient);
        var method = interfaceType.GetMethod("GetAnalyticsListAsync");

        // Assert
        Assert.NotNull(method);
        Assert.Equal(typeof(Task<ZernioPostAnalyticsListDto>), method!.ReturnType);

        var parameters = method.GetParameters();
        var byName = parameters.ToDictionary(p => p.Name!, p => p.ParameterType);

        Assert.Equal(typeof(string), byName["platform"]);
        Assert.Equal(typeof(string), byName["profileId"]);
        Assert.Equal(typeof(string), byName["accountId"]);
        Assert.Equal(typeof(string), byName["source"]);
        Assert.Equal(typeof(DateOnly?), byName["fromDate"]);
        Assert.Equal(typeof(DateOnly?), byName["toDate"]);
        Assert.Equal(typeof(int?), byName["limit"]);
        Assert.Equal(typeof(int?), byName["page"]);
        Assert.Equal(typeof(string), byName["sortBy"]);
        Assert.Equal(typeof(string), byName["order"]);
        Assert.Equal(typeof(CancellationToken), byName["cancellationToken"]);
    }

    [Fact]
    public void IZernioClient_ShouldDeclareGetLinkedInAggregateAnalyticsAsync()
    {
        // Arrange
        var interfaceType = typeof(IZernioClient);
        var method = interfaceType.GetMethod("GetLinkedInAggregateAnalyticsAsync");

        // Assert
        Assert.NotNull(method);
        Assert.Equal(typeof(Task<ZernioLinkedInAggregateAnalyticsResponseDto>), method!.ReturnType);

        var parameters = method.GetParameters();
        var byName = parameters.ToDictionary(p => p.Name!, p => p.ParameterType);

        Assert.Equal(typeof(string), byName["accountId"]);
        Assert.Equal(typeof(string), byName["aggregation"]);
        Assert.Equal(typeof(DateOnly?), byName["startDate"]);
        Assert.Equal(typeof(DateOnly?), byName["endDate"]);
        Assert.Equal(typeof(string), byName["metrics"]);
        Assert.Equal(typeof(CancellationToken), byName["cancellationToken"]);
    }
}
