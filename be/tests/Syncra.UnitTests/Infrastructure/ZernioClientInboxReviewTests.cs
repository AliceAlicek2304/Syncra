using System.Reflection;
using Syncra.Application.DTOs.Inbox;
using Syncra.Application.Interfaces;
using Xunit;

namespace Syncra.UnitTests.Infrastructure;

public class ZernioClientInboxReviewTests
{
    [Fact]
    public void IZernioClient_ShouldDeclareListInboxReviewsAsync()
    {
        var interfaceType = typeof(IZernioClient);
        var method = interfaceType.GetMethod("ListInboxReviewsAsync");

        Assert.NotNull(method);
        Assert.True(method!.ReturnType.IsGenericType);
        Assert.Equal(typeof(Task<>), method!.ReturnType.GetGenericTypeDefinition());
        Assert.Equal(typeof(ZernioInboxReviewsPageDto), method!.ReturnType.GenericTypeArguments[0]);

        var parameters = method.GetParameters();
        Assert.Contains(parameters, p => p.Name == "profileId" && p.ParameterType == typeof(string));
        Assert.Contains(parameters, p => p.Name == "cursor" && p.ParameterType == typeof(string));
        Assert.Contains(parameters, p => p.Name == "platform" && p.ParameterType == typeof(string));
        Assert.Contains(parameters, p => p.Name == "accountId" && p.ParameterType == typeof(string));
    }

    [Fact]
    public void IZernioClient_ShouldDeclareReplyToInboxReviewAsync()
    {
        var interfaceType = typeof(IZernioClient);
        var method = interfaceType.GetMethod("ReplyToInboxReviewAsync");

        Assert.NotNull(method);
        Assert.True(method!.ReturnType.IsGenericType);
        Assert.Equal(typeof(Task<>), method!.ReturnType.GetGenericTypeDefinition());
        Assert.Equal(typeof(ZernioReplyToReviewResponseDto), method!.ReturnType.GenericTypeArguments[0]);

        var parameters = method.GetParameters();
        Assert.Contains(parameters, p => p.Name == "profileId" && p.ParameterType == typeof(string));
        Assert.Contains(parameters, p => p.Name == "reviewId" && p.ParameterType == typeof(string));
        Assert.Contains(parameters, p => p.Name == "accountId" && p.ParameterType == typeof(string));
        Assert.Contains(parameters, p => p.Name == "message" && p.ParameterType == typeof(string));
    }
}
