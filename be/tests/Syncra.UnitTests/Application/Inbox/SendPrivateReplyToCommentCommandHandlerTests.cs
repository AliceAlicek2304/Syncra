using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using FluentAssertions;
using Moq;
using Syncra.Application.DTOs.Zernio;
using Syncra.Application.Features.Inbox.Commands;
using Syncra.Application.Interfaces;
using Syncra.Domain.Entities;
using Syncra.Domain.Exceptions;
using Syncra.Domain.Interfaces;
using Xunit;

namespace Syncra.UnitTests.Application.Inbox;

public class SendPrivateReplyToCommentCommandHandlerTests
{
    private readonly Mock<IInboxRepository> _inboxRepositoryMock;
    private readonly Mock<IZernioClient> _zernioClientMock;
    private readonly SendPrivateReplyToCommentCommandHandler _handler;

    public SendPrivateReplyToCommentCommandHandlerTests()
    {
        _inboxRepositoryMock = new Mock<IInboxRepository>(MockBehavior.Strict);
        _zernioClientMock = new Mock<IZernioClient>(MockBehavior.Strict);
        _handler = new SendPrivateReplyToCommentCommandHandler(
            _inboxRepositoryMock.Object,
            _zernioClientMock.Object);
    }

    [Fact]
    public async Task Handle_MutuallyExclusiveCtas_ShouldThrowDomainException()
    {
        // Arrange
        var workspaceId = Guid.NewGuid();
        var command = new SendPrivateReplyToCommentCommand(
            workspaceId,
            "comment-1",
            "Message",
            new List<ZernioPrivateReplyQuickReplyDto> { new("QR1") },
            new List<ZernioPrivateReplyButtonDto> { new("url", "Title", "https://url.com") }
        );

        // Act
        var act = () => _handler.Handle(command, CancellationToken.None);

        // Assert
        await act.Should().ThrowAsync<DomainException>()
            .WithMessage("Quick replies and buttons are mutually exclusive.");
    }

    [Fact]
    public async Task Handle_PostNotFound_ShouldThrowDomainException()
    {
        // Arrange
        var workspaceId = Guid.NewGuid();
        var command = new SendPrivateReplyToCommentCommand(workspaceId, "comment-1", "Message");

        _inboxRepositoryMock
            .Setup(r => r.GetCommentedPostByZernioPostIdAsync(workspaceId, "comment-1", It.IsAny<CancellationToken>()))
            .ReturnsAsync((InboxCommentedPost?)null);

        // Act
        var act = () => _handler.Handle(command, CancellationToken.None);

        // Assert
        await act.Should().ThrowAsync<DomainException>()
            .WithMessage("InboxCommentedPost 'comment-1' not found.");
    }

    [Fact]
    public async Task Handle_ExpiredComment_ShouldThrowDomainException()
    {
        // Arrange
        var workspaceId = Guid.NewGuid();
        var command = new SendPrivateReplyToCommentCommand(workspaceId, "comment-1", "Message");
        var post = InboxCommentedPost.Create(
            workspaceId,
            "post-1",
            null,
            "facebook",
            "acc-1",
            receivedAtUtc: DateTime.UtcNow.AddDays(-8) // 8 days ago
        );

        _inboxRepositoryMock
            .Setup(r => r.GetCommentedPostByZernioPostIdAsync(workspaceId, "comment-1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(post);

        // Act
        var act = () => _handler.Handle(command, CancellationToken.None);

        // Assert
        await act.Should().ThrowAsync<DomainException>()
            .WithMessage("Private reply can only be sent within 7 days of the comment.");
    }

    [Fact]
    public async Task Handle_AlreadySentPrivateReply_ShouldThrowDomainException()
    {
        // Arrange
        var workspaceId = Guid.NewGuid();
        var command = new SendPrivateReplyToCommentCommand(workspaceId, "comment-1", "Message");
        var post = InboxCommentedPost.Create(
            workspaceId,
            "post-1",
            null,
            "facebook",
            "acc-1",
            receivedAtUtc: DateTime.UtcNow.AddDays(-2)
        );

        _inboxRepositoryMock
            .Setup(r => r.GetCommentedPostByZernioPostIdAsync(workspaceId, "comment-1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(post);

        _inboxRepositoryMock
            .Setup(r => r.HasSentPrivateReplyAsync(workspaceId, "comment-1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);

        // Act
        var act = () => _handler.Handle(command, CancellationToken.None);

        // Assert
        await act.Should().ThrowAsync<DomainException>()
            .WithMessage("A private reply has already been sent for this comment.");
    }

    [Fact]
    public async Task Handle_ValidRequest_ShouldCallSdkAndSaveRecord()
    {
        // Arrange
        var workspaceId = Guid.NewGuid();
        var command = new SendPrivateReplyToCommentCommand(workspaceId, "comment-1", "Message");
        var post = InboxCommentedPost.Create(
            workspaceId,
            "post-1",
            null,
            "facebook",
            "acc-1",
            receivedAtUtc: DateTime.UtcNow.AddDays(-2)
        );
        var expectedResponse = new ZernioCommentActionResponseDto("sent", "comment-1", "msg-1", "facebook");

        _inboxRepositoryMock
            .Setup(r => r.GetCommentedPostByZernioPostIdAsync(workspaceId, "comment-1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(post);

        _inboxRepositoryMock
            .Setup(r => r.HasSentPrivateReplyAsync(workspaceId, "comment-1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(false);

        _zernioClientMock
            .Setup(z => z.SendPrivateReplyToCommentAsync(
                "post-1",
                "comment-1",
                It.Is<ZernioPrivateReplyRequestDto>(req => req.AccountId == "acc-1" && req.Message == "Message"),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(expectedResponse);

        _inboxRepositoryMock
            .Setup(r => r.AddPrivateReplyRecordAsync(It.IsAny<InboxCommentPrivateReply>(), It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);

        // Act
        var result = await _handler.Handle(command, CancellationToken.None);

        // Assert
        result.Should().BeEquivalentTo(expectedResponse);
        _inboxRepositoryMock.Verify(r => r.AddPrivateReplyRecordAsync(
            It.Is<InboxCommentPrivateReply>(rec => rec.WorkspaceId == workspaceId && rec.ZernioCommentId == "comment-1"),
            It.IsAny<CancellationToken>()), Times.Once);
    }
}
