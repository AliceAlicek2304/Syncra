using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Moq;
using Syncra.Application.Interfaces;
using Syncra.Domain.Entities;
using Syncra.Domain.Enums;
using Syncra.Infrastructure.Jobs;
using Syncra.Infrastructure.Persistence;
using Xunit;

namespace Syncra.UnitTests.Infrastructure;

[Trait("Category", "Inbox")]
[Trait("Category", "Webhook")]
public class ProcessZernioWebhookJobInboxTests : IDisposable
{
    private const string MessageReceivedPayload = @"{
  ""account"": {
    ""id"": ""zernio-account-123"",
    ""platform"": ""instagram"",
    ""displayName"": ""My Instagram""
  },
  ""conversation"": {
    ""id"": ""zernio-conv-456"",
    ""status"": ""active""
  },
  ""message"": {
    ""id"": ""zernio-msg-789"",
    ""text"": ""Hey! How's it going?"",
    ""sender"": {
      ""id"": ""sender-user-001"",
      ""name"": ""John Doe"",
      ""username"": ""johndoe""
    },
    ""sentAt"": ""2026-05-23T10:30:00Z"",
    ""direction"": ""incoming""
  }
}";

    private readonly AppDbContext _db;
    private readonly Mock<IPostStatusNotifier> _postNotifierMock;
    private readonly Mock<IInboxNotifier> _inboxNotifierMock;
    private readonly Mock<ILogger<ProcessZernioWebhookJob>> _loggerMock;
    private readonly ProcessZernioWebhookJob _job;
    private readonly Guid _workspaceId;

    public ProcessZernioWebhookJobInboxTests()
    {
        _workspaceId = Guid.NewGuid();

        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        _db = new AppDbContext(options);
        _postNotifierMock = new Mock<IPostStatusNotifier>();
        _inboxNotifierMock = new Mock<IInboxNotifier>();
        _loggerMock = new Mock<ILogger<ProcessZernioWebhookJob>>();

        _job = new ProcessZernioWebhookJob(_db, _loggerMock.Object, _postNotifierMock.Object, _inboxNotifierMock.Object);
    }

    public void Dispose()
    {
        _db.Dispose();
    }

    [Fact]
    public async Task HandleMessageReceived_ShouldCreateConversationAndMessage()
    {
        // Arrange
        using var doc = JsonDocument.Parse(MessageReceivedPayload);
        var root = doc.RootElement;
        var accountId = root.GetProperty("account").GetProperty("id").GetString()!;

        // Seed ZernioProfile
        var profile = ZernioProfile.Create(
            _workspaceId, "zernio-profile-001", "Test Profile", "instagram");
        _db.ZernioProfiles.Add(profile);

        // Seed SocialAccount matching the webhook account.id
        var socialAccount = SocialAccount.Create(
            _workspaceId,
            profile.Id,
            externalAccountId: accountId,
            platform: "instagram",
            displayName: "My Instagram");
        _db.SocialAccounts.Add(socialAccount);

        // Seed webhook event
        var webhookEvent = ZernioWebhookEvent.Create(
            _workspaceId,
            eventType: "message.received",
            payload: MessageReceivedPayload);
        _db.ZernioWebhookEvents.Add(webhookEvent);

        await _db.SaveChangesAsync();

        // Act
        await _job.ExecuteAsync(webhookEvent.Id, CancellationToken.None);

        // Assert - conversation created
        var conversation = await _db.InboxConversations
            .FirstOrDefaultAsync(c => c.WorkspaceId == _workspaceId);
        Assert.NotNull(conversation);
        Assert.Equal("zernio-conv-456", conversation!.ZernioConversationId);
        Assert.Equal("instagram", conversation.Platform);
        Assert.Equal(socialAccount.Id, conversation.SocialAccountId);
        Assert.Equal("Hey! How's it going?", conversation.LastMessageText);
        Assert.Equal(1, conversation.UnreadCount);
        Assert.False(conversation.IsRead);

        // Assert - message created
        var message = await _db.InboxMessages
            .FirstOrDefaultAsync(m => m.WorkspaceId == _workspaceId);
        Assert.NotNull(message);
        Assert.Equal("zernio-msg-789", message!.ZernioMessageId);
        Assert.Equal("incoming", message.Direction);
        Assert.Equal("Hey! How's it going?", message.BodyText);

        // Assert - notifier called
        _inboxNotifierMock.Verify(n => n.NotifyItemCreatedAsync(
            _workspaceId,
            "dm",
            It.IsAny<string>(),
            It.IsAny<string>(),
            "instagram",
            It.IsAny<string>(),
            It.IsAny<int>(),
            It.IsAny<CancellationToken>()), Times.Once);

        // Assert - event marked processed
        Assert.Equal(WebhookEventStatus.Processed, webhookEvent.Status);
    }

    [Fact]
    public async Task HandleMessageReceived_DuplicateMessage_ShouldSkipInsert()
    {
        using var doc = JsonDocument.Parse(MessageReceivedPayload);
        var root = doc.RootElement;
        var accountId = root.GetProperty("account").GetProperty("id").GetString()!;

        var profile = ZernioProfile.Create(
            _workspaceId, "zernio-profile-001", "Test Profile", "instagram");
        _db.ZernioProfiles.Add(profile);

        var socialAccount = SocialAccount.Create(
            _workspaceId, profile.Id, accountId, "instagram", "My Instagram");
        _db.SocialAccounts.Add(socialAccount);
        await _db.SaveChangesAsync();

        // Seed existing conversation + message
        var conversation = InboxConversation.Create(
            _workspaceId, "zernio-conv-456", socialAccount.Id, "instagram",
            "John Doe", null, "Previous message", System.DateTime.UtcNow.AddHours(-1));
        _db.InboxConversations.Add(conversation);
        await _db.SaveChangesAsync();

        var existingMessage = InboxMessage.Create(
            _workspaceId, conversation.Id, "zernio-msg-789",
            "Inbound", "Hey! How's it going?", System.DateTime.UtcNow);
        _db.InboxMessages.Add(existingMessage);
        await _db.SaveChangesAsync();

        var webhookEvent = ZernioWebhookEvent.Create(
            _workspaceId, "message.received", MessageReceivedPayload);
        _db.ZernioWebhookEvents.Add(webhookEvent);
        await _db.SaveChangesAsync();

        // Act
        await _job.ExecuteAsync(webhookEvent.Id, CancellationToken.None);

        // Assert - only one message exists (no duplicate inserted)
        var messageCount = await _db.InboxMessages
            .CountAsync(m => m.WorkspaceId == _workspaceId);
        Assert.Equal(1, messageCount);

        // Assert - conversation last message text updated (preview refresh)
        var updatedConversation = await _db.InboxConversations
            .FirstAsync(c => c.Id == conversation.Id);
        Assert.Equal("Hey! How's it going?", updatedConversation.LastMessageText);

        // Assert - unread count unchanged (duplicate → no new unread)
        Assert.Equal(0, updatedConversation.UnreadCount);
    }
}