using System.Threading;
using System.Threading.Tasks;
using FluentAssertions;
using MediatR;
using Microsoft.Extensions.Caching.Distributed;
using Moq;
using Syncra.Application.Features.Auth.Commands;
using Syncra.Application.Interfaces;
using Syncra.Application.Common.Interfaces;
using Syncra.Domain.Interfaces;
using Syncra.Domain.Entities;
using Xunit;

namespace Syncra.UnitTests.Application.Auth;

public class ForgotPasswordCommandHandlerTests
{
    private readonly Mock<IUserRepository> _userRepositoryMock;
    private readonly Mock<IPasswordResetTokenRepository> _tokenRepositoryMock;
    private readonly Mock<IEmailService> _emailServiceMock;
    private readonly Mock<IUnitOfWork> _unitOfWorkMock;
    private readonly Mock<IDistributedCache> _cacheMock;
    private readonly ForgotPasswordCommandHandler _handler;

    public ForgotPasswordCommandHandlerTests()
    {
        _userRepositoryMock = new Mock<IUserRepository>(MockBehavior.Strict);
        _tokenRepositoryMock = new Mock<IPasswordResetTokenRepository>(MockBehavior.Strict);
        _emailServiceMock = new Mock<IEmailService>(MockBehavior.Strict);
        _unitOfWorkMock = new Mock<IUnitOfWork>(MockBehavior.Strict);
        _cacheMock = new Mock<IDistributedCache>(MockBehavior.Strict);

        _handler = new ForgotPasswordCommandHandler(
            _userRepositoryMock.Object,
            _tokenRepositoryMock.Object,
            _emailServiceMock.Object,
            _unitOfWorkMock.Object,
            _cacheMock.Object);
    }

    [Fact]
    public void ForgotPasswordCommand_ShouldImplementIRequest()
    {
        // Arrange
        var command = new ForgotPasswordCommand("test@example.com");

        // Assert
        command.Should().BeAssignableTo<IRequest<ForgotPasswordResponse>>();
        command.Email.Should().Be("test@example.com");
    }

    [Fact]
    public async Task Handle_ExistingEmail_ShouldGenerateTokenStoreHashAndSendEmail()
    {
        // Arrange
        var email = "TEST@EXAMPLE.COM";
        var normalizedEmail = "TEST@EXAMPLE.COM";
        var user = User.Create("test@example.com", "hashedPassword123");
        var command = new ForgotPasswordCommand(email);

        _cacheMock
            .Setup(c => c.GetStringAsync($"reset_pwd:{normalizedEmail}", It.IsAny<CancellationToken>()))
            .ReturnsAsync((string?)null);

        _userRepositoryMock
            .Setup(r => r.GetByEmailAsync(normalizedEmail))
            .ReturnsAsync(user);

        _tokenRepositoryMock
            .Setup(r => r.AddAsync(It.IsAny<PasswordResetToken>()))
            .Returns(Task.CompletedTask);

        _unitOfWorkMock
            .Setup(u => u.SaveChangesAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(1);

        _emailServiceMock
            .Setup(e => e.SendPasswordResetEmailAsync(user, It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);

        _cacheMock
            .Setup(c => c.SetStringAsync(
                $"reset_pwd:{normalizedEmail}",
                "1",
                It.IsAny<DistributedCacheEntryOptions>(),
                It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);

        // Act
        var result = await _handler.Handle(command, CancellationToken.None);

        // Assert
        result.Should().NotBeNull();
        result.Message.Should().Be("If an account with that email exists, a password reset link has been sent.");

        _tokenRepositoryMock.Verify(r => r.AddAsync(It.IsAny<PasswordResetToken>()), Times.Once);
        _unitOfWorkMock.Verify(u => u.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
        _emailServiceMock.Verify(e => e.SendPasswordResetEmailAsync(user, It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task Handle_NonExistentEmail_ShouldNotCallRepositoryAndReturnGenericResponse()
    {
        // Arrange
        var email = "nonexistent@example.com";
        var normalizedEmail = "NONEXISTENT@EXAMPLE.COM";
        var command = new ForgotPasswordCommand(email);

        _cacheMock
            .Setup(c => c.GetStringAsync($"reset_pwd:{normalizedEmail}", It.IsAny<CancellationToken>()))
            .ReturnsAsync((string?)null);

        _userRepositoryMock
            .Setup(r => r.GetByEmailAsync(normalizedEmail))
            .ReturnsAsync((User?)null);

        _cacheMock
            .Setup(c => c.SetStringAsync(
                $"reset_pwd:{normalizedEmail}",
                "1",
                It.IsAny<DistributedCacheEntryOptions>(),
                It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);

        // Act
        var result = await _handler.Handle(command, CancellationToken.None);

        // Assert
        result.Should().NotBeNull();
        result.Message.Should().Be("If an account with that email exists, a password reset link has been sent.");

        _tokenRepositoryMock.Verify(r => r.AddAsync(It.IsAny<PasswordResetToken>()), Times.Never);
        _emailServiceMock.Verify(e => e.SendPasswordResetEmailAsync(It.IsAny<User>(), It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task Handle_RateLimited_ShouldReturnGenericResponseWithoutProcessing()
    {
        // Arrange
        var email = "test@example.com";
        var normalizedEmail = "TEST@EXAMPLE.COM";
        var command = new ForgotPasswordCommand(email);

        _cacheMock
            .Setup(c => c.GetStringAsync($"reset_pwd:{normalizedEmail}", It.IsAny<CancellationToken>()))
            .ReturnsAsync("1");

        // Act
        var result = await _handler.Handle(command, CancellationToken.None);

        // Assert
        result.Should().NotBeNull();
        result.Message.Should().Be("If an account with that email exists, a password reset link has been sent.");

        _userRepositoryMock.Verify(r => r.GetByEmailAsync(It.IsAny<string>()), Times.Never);
        _tokenRepositoryMock.Verify(r => r.AddAsync(It.IsAny<PasswordResetToken>()), Times.Never);
        _emailServiceMock.Verify(e => e.SendPasswordResetEmailAsync(It.IsAny<User>(), It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public void ForgotPasswordResponse_ShouldBeRecord()
    {
        // Assert
        var response = new ForgotPasswordResponse("Test message");
        response.Message.Should().Be("Test message");
    }
}
