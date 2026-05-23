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
[Trait("Category", "Review")]
public class ProcessZernioWebhookJobReviewTests : IDisposable
{
    private const string ReviewNewPayload = @"{
  ""id"": ""webhook-evt-review-001"",
  ""event"": ""review.new"",
  ""review"": {
    ""id"": ""accounts/123/locations/456/reviews/789"",
    ""platform"": ""googlebusiness"",
    ""rating"": 5,
    ""text"": ""Great service! Very professional."",
    ""reviewer"": {
      ""id"": null,
      ""name"": ""John Smith"",
      ""profileImage"": null
    },
    ""createdAt"": ""2026-05-23T12:00:00Z"",
    ""hasReply"": false,
    ""reply"": null
  },
  ""account"": {
    ""id"": ""zernio-account-456"",
    ""platform"": ""googlebusiness"",
    ""username"": ""my_business""
  },
  ""timestamp"": ""2026-05-23T12:00:05Z""
}";

    private readonly AppDbContext _db;
    private readonly Mock<IPostStatusNotifier> _postNotifierMock;
    private readonly Mock<IInboxNotifier> _inboxNotifierMock;
    private readonly Mock<ILogger<ProcessZernioWebhookJob>> _loggerMock;
    private readonly ProcessZernioWebhookJob _job;
    private readonly Guid _workspaceId;

    public ProcessZernioWebhookJobReviewTests()
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
    public async Task HandleReviewNew_ShouldCreateInboxReview()
    {
        // Arrange
        using var doc = JsonDocument.Parse(ReviewNewPayload);
        var root = doc.RootElement;
        var accountId = root.GetProperty("account").GetProperty("id").GetString()!;

        // Seed ZernioProfile
        var profile = ZernioProfile.Create(
            _workspaceId, "zernio-profile-001", "Test Profile", "googlebusiness");
        _db.ZernioProfiles.Add(profile);

        // Seed SocialAccount matching the webhook account.id
        var socialAccount = SocialAccount.Create(
            _workspaceId,
            profile.Id,
            externalAccountId: accountId,
            platform: "googlebusiness",
            displayName: "My Business");
        _db.SocialAccounts.Add(socialAccount);

        // Seed webhook event
        var webhookEvent = ZernioWebhookEvent.Create(
            _workspaceId,
            eventType: "review.new",
            payload: ReviewNewPayload);
        _db.ZernioWebhookEvents.Add(webhookEvent);

        await _db.SaveChangesAsync();

        // Act
        await _job.ExecuteAsync(webhookEvent.Id, CancellationToken.None);

        // Assert - InboxReview created
        var review = await _db.InboxReviews
            .FirstOrDefaultAsync(r => r.WorkspaceId == _workspaceId);
        Assert.NotNull(review);
        Assert.Equal("accounts/123/locations/456/reviews/789", review!.ZernioReviewId);
        Assert.Equal("googlebusiness", review.Platform);
        Assert.Equal(socialAccount.Id, review.SocialAccountId);
        Assert.Equal("John Smith", review.ReviewerName);
        Assert.Equal(5, review.StarRating);
        Assert.Equal("Great service! Very professional.", review.ReviewText);
        Assert.Null(review.ReviewerImageUrl);
        Assert.False(review.HasReply);
        Assert.Null(review.ReplyText);
        Assert.False(review.IsRead);

        // Assert - notifier called with type "review"
        _inboxNotifierMock.Verify(n => n.NotifyItemCreatedAsync(
            _workspaceId,
            "review",
            It.IsAny<string>(),
            It.IsAny<string>(),
            "googlebusiness",
            It.IsAny<string>(),
            It.IsAny<int>(),
            It.IsAny<CancellationToken>()), Times.Once);

        // Assert - event marked processed
        Assert.Equal(WebhookEventStatus.Processed, webhookEvent.Status);
    }

    [Fact]
    public async Task HandleReviewNew_Duplicate_ShouldSkipInsert()
    {
        // Arrange
        using var doc = JsonDocument.Parse(ReviewNewPayload);
        var root = doc.RootElement;
        var accountId = root.GetProperty("account").GetProperty("id").GetString()!;

        var profile = ZernioProfile.Create(
            _workspaceId, "zernio-profile-001", "Test Profile", "googlebusiness");
        _db.ZernioProfiles.Add(profile);

        var socialAccount = SocialAccount.Create(
            _workspaceId, profile.Id, accountId, "googlebusiness", "My Business");
        _db.SocialAccounts.Add(socialAccount);
        await _db.SaveChangesAsync();

        // Seed existing review
        var existingReview = InboxReview.Create(
            _workspaceId,
            "accounts/123/locations/456/reviews/789",
            socialAccount.Id,
            "googlebusiness",
            "John Smith",
            5,
            "Great service! Very professional.",
            zernioAccountId: accountId,
            receivedAtUtc: System.DateTime.UtcNow.AddHours(-1));
        _db.InboxReviews.Add(existingReview);
        await _db.SaveChangesAsync();

        var webhookEvent = ZernioWebhookEvent.Create(
            _workspaceId, "review.new", ReviewNewPayload);
        _db.ZernioWebhookEvents.Add(webhookEvent);
        await _db.SaveChangesAsync();

        // Act
        await _job.ExecuteAsync(webhookEvent.Id, CancellationToken.None);

        // Assert - only one review exists (no duplicate)
        var reviewCount = await _db.InboxReviews
            .CountAsync(r => r.WorkspaceId == _workspaceId);
        Assert.Equal(1, reviewCount);

        // Assert - event marked processed
        Assert.Equal(WebhookEventStatus.Processed, webhookEvent.Status);
    }

    [Fact]
    public async Task HandleReviewNew_MissingSocialAccount_ShouldSkip()
    {
        // Arrange - do NOT seed SocialAccount
        var webhookEvent = ZernioWebhookEvent.Create(
            _workspaceId, "review.new", ReviewNewPayload);
        _db.ZernioWebhookEvents.Add(webhookEvent);
        await _db.SaveChangesAsync();

        // Act
        await _job.ExecuteAsync(webhookEvent.Id, CancellationToken.None);

        // Assert - no InboxReview created
        var reviewCount = await _db.InboxReviews
            .CountAsync(r => r.WorkspaceId == _workspaceId);
        Assert.Equal(0, reviewCount);

        // Assert - event marked processed (warning logged, no retry)
        Assert.Equal(WebhookEventStatus.Processed, webhookEvent.Status);
    }

    [Fact]
    public async Task HandleReviewNew_WithExistingReply_ShouldPersistReplyData()
    {
        // Arrange - payload with existing reply
        const string payloadWithReply = @"{
          ""id"": ""webhook-evt-review-002"",
          ""event"": ""review.new"",
          ""review"": {
            ""id"": ""accounts/999/locations/888/reviews/777"",
            ""platform"": ""googlebusiness"",
            ""rating"": 4,
            ""text"": ""Pretty good."",
            ""reviewer"": {
              ""id"": ""rev-123"",
              ""name"": ""Alice"",
              ""profileImage"": ""https://example.com/alice.jpg""
            },
            ""createdAt"": ""2026-05-23T13:00:00Z"",
            ""hasReply"": true,
            ""reply"": {
              ""text"": ""Thank you Alice!"",
              ""createdAt"": ""2026-05-23T14:00:00Z""
            }
          },
          ""account"": {
            ""id"": ""zernio-account-456"",
            ""platform"": ""googlebusiness"",
            ""username"": ""my_business""
          },
          ""timestamp"": ""2026-05-23T13:00:05Z""
        }";

        using var doc = JsonDocument.Parse(payloadWithReply);
        var root = doc.RootElement;
        var accountId = root.GetProperty("account").GetProperty("id").GetString()!;

        var profile = ZernioProfile.Create(
            _workspaceId, "zernio-profile-001", "Test Profile", "googlebusiness");
        _db.ZernioProfiles.Add(profile);

        var socialAccount = SocialAccount.Create(
            _workspaceId, profile.Id, accountId, "googlebusiness", "My Business");
        _db.SocialAccounts.Add(socialAccount);

        var webhookEvent = ZernioWebhookEvent.Create(
            _workspaceId, "review.new", payloadWithReply);
        _db.ZernioWebhookEvents.Add(webhookEvent);
        await _db.SaveChangesAsync();

        // Act
        await _job.ExecuteAsync(webhookEvent.Id, CancellationToken.None);

        // Assert - InboxReview with reply data
        var review = await _db.InboxReviews
            .FirstOrDefaultAsync(r => r.ZernioReviewId == "accounts/999/locations/888/reviews/777");
        Assert.NotNull(review);
        Assert.True(review!.HasReply);
        Assert.Equal("Thank you Alice!", review.ReplyText);
        Assert.NotNull(review.ReplyCreatedAtUtc);
        Assert.Equal(4, review.StarRating);
        Assert.Equal("Alice", review.ReviewerName);
        Assert.Equal("https://example.com/alice.jpg", review.ReviewerImageUrl);

        // Assert - event marked processed
        Assert.Equal(WebhookEventStatus.Processed, webhookEvent.Status);
    }
}
