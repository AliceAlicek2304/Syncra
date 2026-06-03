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
        Assert.Contains(parameters, p => p.Name == "accountId" && p.ParameterType == typeof(string));
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
        Assert.Contains(parameters, p => p.Name == "request" && p.ParameterType == typeof(InboxSendMessageRequest));
    }

    [Fact]
    public void IZernioClient_ShouldDeclareListInboxCommentsAsync()
    {
        var interfaceType = typeof(IZernioClient);
        var method = interfaceType.GetMethod("ListInboxCommentsAsync");

        Assert.NotNull(method);
        Assert.True(method!.ReturnType.IsGenericType);
        Assert.Equal(typeof(Task<>), method!.ReturnType.GetGenericTypeDefinition());
        Assert.Equal(typeof(ZernioInboxCommentsPageDto), method!.ReturnType.GenericTypeArguments[0]);

        var parameters = method.GetParameters();
        Assert.Contains(parameters, p => p.Name == "profileId" && p.ParameterType == typeof(string));
        Assert.Contains(parameters, p => p.Name == "since" && p.ParameterType == typeof(DateTime?));
        Assert.Contains(parameters, p => p.Name == "cursor" && p.ParameterType == typeof(string));
    }

    [Fact]
    public void IZernioClient_ShouldDeclareReplyToInboxCommentAsync()
    {
        var interfaceType = typeof(IZernioClient);
        var method = interfaceType.GetMethod("ReplyToInboxCommentAsync");

        Assert.NotNull(method);
        Assert.True(method!.ReturnType.IsGenericType);
        Assert.Equal(typeof(Task<>), method!.ReturnType.GetGenericTypeDefinition());
        Assert.Equal(typeof(ZernioReplyToCommentResponseDto), method!.ReturnType.GenericTypeArguments[0]);

        var parameters = method.GetParameters();
        Assert.Contains(parameters, p => p.Name == "profileId" && p.ParameterType == typeof(string));
        Assert.Contains(parameters, p => p.Name == "zernioPostId" && p.ParameterType == typeof(string));
        Assert.Contains(parameters, p => p.Name == "accountId" && p.ParameterType == typeof(string));
        Assert.Contains(parameters, p => p.Name == "message" && p.ParameterType == typeof(string));
        Assert.Contains(parameters, p => p.Name == "commentId" && p.ParameterType == typeof(string));
    }

    [Fact]
    public void IZernioClient_ShouldDeclareGetInboxConversationAsync()
    {
        var method = typeof(IZernioClient).GetMethod("GetInboxConversationAsync");
        Assert.NotNull(method);
        Assert.Equal(typeof(InboxConversationDetailsDto), method!.ReturnType.GenericTypeArguments[0]);
    }

    [Fact]
    public void IZernioClient_ShouldDeclareCreateInboxConversationAsync()
    {
        var method = typeof(IZernioClient).GetMethod("CreateInboxConversationAsync");
        Assert.NotNull(method);
        Assert.Equal(typeof(InboxCreateConversationResponseDto), method!.ReturnType.GenericTypeArguments[0]);
    }

    [Fact]
    public void IZernioClient_ShouldDeclareUpdateInboxConversationAsync()
    {
        var method = typeof(IZernioClient).GetMethod("UpdateInboxConversationAsync");
        Assert.NotNull(method);
        Assert.Equal(typeof(InboxUpdateConversationResponseDto), method!.ReturnType.GenericTypeArguments[0]);
    }

    [Fact]
    public void IZernioClient_ShouldDeclareMarkConversationReadAsync()
    {
        var method = typeof(IZernioClient).GetMethod("MarkConversationReadAsync");
        Assert.NotNull(method);
        Assert.Equal(typeof(bool), method!.ReturnType.GenericTypeArguments[0]);
    }

    [Fact]
    public void IZernioClient_ShouldDeclareEditInboxMessageAsync()
    {
        var method = typeof(IZernioClient).GetMethod("EditInboxMessageAsync");
        Assert.NotNull(method);
        Assert.Equal(typeof(InboxEditMessageResponseDto), method!.ReturnType.GenericTypeArguments[0]);
    }

    [Fact]
    public void IZernioClient_ShouldDeclareDeleteInboxMessageAsync()
    {
        var method = typeof(IZernioClient).GetMethod("DeleteInboxMessageAsync");
        Assert.NotNull(method);
        Assert.Equal(typeof(bool), method!.ReturnType.GenericTypeArguments[0]);
    }

    [Fact]
    public void IZernioClient_ShouldDeclareAddMessageReactionAsync()
    {
        var method = typeof(IZernioClient).GetMethod("AddMessageReactionAsync");
        Assert.NotNull(method);
        Assert.Equal(typeof(bool), method!.ReturnType.GenericTypeArguments[0]);
    }

    [Fact]
    public void IZernioClient_ShouldDeclareRemoveMessageReactionAsync()
    {
        var method = typeof(IZernioClient).GetMethod("RemoveMessageReactionAsync");
        Assert.NotNull(method);
        Assert.Equal(typeof(bool), method!.ReturnType.GenericTypeArguments[0]);
    }

    [Fact]
    public void IZernioClient_ShouldDeclareSendTypingIndicatorAsync()
    {
        var method = typeof(IZernioClient).GetMethod("SendTypingIndicatorAsync");
        Assert.NotNull(method);
        Assert.Equal(typeof(bool), method!.ReturnType.GenericTypeArguments[0]);
    }
}