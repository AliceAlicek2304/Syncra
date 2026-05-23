using System.Reflection;
using Syncra.Application.DTOs.Inbox;
using Syncra.Application.Interfaces;
using Xunit;

namespace Syncra.UnitTests.Infrastructure;

public class ZernioClientInboxTests
{
    [Fact]
    public void IZernioClient_ShouldDeclareListInboxConversationsAsync()
    {
        var interfaceType = typeof(IZernioClient);
        var method = interfaceType.GetMethod("ListInboxConversationsAsync");

        Assert.NotNull(method);
        Assert.True(method!.ReturnType.IsGenericType);
        Assert.Equal(typeof(Task<>), method!.ReturnType.GetGenericTypeDefinition());
        Assert.Equal(typeof(ZernioInboxConversationsPageDto), method!.ReturnType.GenericTypeArguments[0]);

        var parameters = method.GetParameters();
        Assert.Contains(parameters, p => p.Name == "profileId" && p.ParameterType == typeof(string));
        Assert.Contains(parameters, p => p.Name == "cursor" && p.ParameterType == typeof(string));
    }

    [Fact]
    public void IZernioClient_ShouldDeclareListInboxMessagesAsync()
    {
        var interfaceType = typeof(IZernioClient);
        var method = interfaceType.GetMethod("ListInboxMessagesAsync");

        Assert.NotNull(method);
        Assert.True(method!.ReturnType.IsGenericType);
        Assert.Equal(typeof(Task<>), method!.ReturnType.GetGenericTypeDefinition());
        Assert.Equal(typeof(ZernioInboxMessagesPageDto), method!.ReturnType.GenericTypeArguments[0]);

        var parameters = method.GetParameters();
        Assert.Contains(parameters, p => p.Name == "conversationId" && p.ParameterType == typeof(string));
        Assert.Contains(parameters, p => p.Name == "cursor" && p.ParameterType == typeof(string));
    }

    [Fact]
    public void IZernioClient_ShouldDeclareSendInboxMessageAsync()
    {
        var interfaceType = typeof(IZernioClient);
        var method = interfaceType.GetMethod("SendInboxMessageAsync");

        Assert.NotNull(method);
        Assert.True(method!.ReturnType.IsGenericType);
        Assert.Equal(typeof(Task<>), method!.ReturnType.GetGenericTypeDefinition());
        Assert.Equal(typeof(ZernioSendMessageResponseDto), method!.ReturnType.GenericTypeArguments[0]);

        var parameters = method.GetParameters();
        Assert.Contains(parameters, p => p.Name == "profileId" && p.ParameterType == typeof(string));
        Assert.Contains(parameters, p => p.Name == "conversationId" && p.ParameterType == typeof(string));
        Assert.Contains(parameters, p => p.Name == "accountId" && p.ParameterType == typeof(string));
        Assert.Contains(parameters, p => p.Name == "text" && p.ParameterType == typeof(string));
    }
}