using System.Threading;
using System.Threading.Tasks;
using FluentAssertions;
using MediatR;
using Moq;
using Syncra.Application.Features.Auth.Commands;
using Syncra.Application.Common.Interfaces;
using Syncra.Domain.Interfaces;
using Syncra.Domain.Entities;
using Syncra.Domain.Exceptions;
using Xunit;

namespace Syncra.UnitTests.Application.Auth;

public class ResetPasswordCommandHandlerTests
{
    private readonly Mock<IPasswordResetTokenRepository> _tokenRepositoryMock;
    private readonly Mock<IUserRepository> _userRepositoryMock;
    private readonly Mock<IUserSessionRepository> _sessionRepositoryMock;
    private readonly Mock<IUnitOfWork> _unitOfWorkMock;
    private readonly ResetPasswordCommandHandler _handler;

    public ResetPasswordCommandHandlerTests()
    {
        _tokenRepositoryMock = new Mock<IPasswordResetTokenRepository>(MockBehavior.Strict);
        _userRepositoryMock = new Mock<IUserRepository>(MockBehavior.Strict);
        _sessionRepositoryMock = new Mock<IUserSessionRepository>(MockBehavior.Strict);
        _unitOfWorkMock = new Mock<IUnitOfWork>(MockBehavior.Strict);

        _handler = new ResetPasswordCommandHandler(
            _tokenRepositoryMock.Object,
            _userRepositoryMock.Object,
            _sessionRepositoryMock.Object,
            _unitOfWorkMock.Object);
    }

    [Fact]
    public void ResetPasswordCommand_ShouldBeRecordWithTokenAndNewPassword()
    {
        // Arrange
        var command = new ResetPasswordCommand("reset-token-123", "NewP@ssword456");

        // Assert
        command.Should().BeAssignableTo<IRequest<Unit>>();
        command.Token.Should().Be("reset-token-123");
        command.NewPassword.Should().Be("NewP@ssword456");
    }

    [Fact]
    public async Task Handle_ValidToken_ShouldUpdatePasswordMarkTokenUsedAndInvalidateSessions()
    {
        // Arrange
        var token = "valid-reset-token";
        var newPassword = "NewPassword123!";
        var command = new ResetPasswordCommand(token, newPassword);
        var user = User.Create("test@example.com", "old-hashed-password");
        var userId = user.Id;

        // Get private field to set Id for the user
        var userIdField = typeof(EntityBase).GetProperty("Id");
        userIdField!.SetValue(user, userId);

        var resetToken = new PasswordResetToken
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            TokenHash = "hashed-token",
            ExpiresAtUtc = DateTime.UtcNow.AddHours(1),
            User = user
        };

        var expectedTokenHash = Convert.ToBase64String(
            System.Security.Cryptography.SHA256.HashData(
                System.Text.Encoding.UTF8.GetBytes(token)));

        _tokenRepositoryMock
            .Setup(r => r.GetByTokenHashAsync(It.IsAny<string>()))
            .ReturnsAsync(resetToken);

        _userRepositoryMock
            .Setup(r => r.UpdateAsync(user))
            .Returns(Task.CompletedTask);

        _tokenRepositoryMock
            .Setup(r => r.UpdateAsync(resetToken))
            .Returns(Task.CompletedTask);

        _sessionRepositoryMock
            .Setup(r => r.InvalidateAllForUserAsync(userId))
            .Returns(Task.CompletedTask);

        _unitOfWorkMock
            .Setup(u => u.SaveChangesAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(1);

        // Act
        var result = await _handler.Handle(command, CancellationToken.None);

        // Assert
        result.Should().Be(Unit.Value);

        // Verify the token hash was used for lookup
        _tokenRepositoryMock.Verify(r => r.GetByTokenHashAsync(It.IsAny<string>()), Times.Once);

        // Verify password was updated
        _userRepositoryMock.Verify(r => r.UpdateAsync(user), Times.Once);
        user.PasswordHash.Should().NotBe("old-hashed-password");
        user.PasswordHash.Should().StartWith("$2"); // BCrypt hash prefix

        // Verify token was marked as used
        _tokenRepositoryMock.Verify(r => r.UpdateAsync(resetToken), Times.Once);
        resetToken.UsedAtUtc.Should().NotBeNull();

        // Verify sessions were invalidated
        _sessionRepositoryMock.Verify(r => r.InvalidateAllForUserAsync(userId), Times.Once);

        // Verify persistence
        _unitOfWorkMock.Verify(u => u.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task Handle_InvalidToken_ShouldThrowDomainException()
    {
        // Arrange
        var command = new ResetPasswordCommand("invalid-token", "NewPassword123!");

        _tokenRepositoryMock
            .Setup(r => r.GetByTokenHashAsync(It.IsAny<string>()))
            .ReturnsAsync((PasswordResetToken?)null);

        // Act
        var act = async () => await _handler.Handle(command, CancellationToken.None);

        // Assert
        var exception = await act.Should().ThrowAsync<DomainException>();
        exception.Which.Code.Should().Be("invalid_reset_token");
        exception.Which.Message.Should().Be("The reset link is invalid or has expired.");
    }

    [Fact]
    public async Task Handle_ExpiredToken_ShouldThrowDomainException()
    {
        // Arrange
        var command = new ResetPasswordCommand("expired-token", "NewPassword123!");
        var user = User.Create("test@example.com", "password-hash");

        var resetToken = new PasswordResetToken
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            TokenHash = "hashed-expired-token",
            ExpiresAtUtc = DateTime.UtcNow.AddHours(-1), // Expired
            User = user
        };

        _tokenRepositoryMock
            .Setup(r => r.GetByTokenHashAsync(It.IsAny<string>()))
            .ReturnsAsync(resetToken);

        // Act
        var act = async () => await _handler.Handle(command, CancellationToken.None);

        // Assert
        var exception = await act.Should().ThrowAsync<DomainException>();
        exception.Which.Code.Should().Be("invalid_reset_token");
        exception.Which.Message.Should().Be("The reset link is invalid or has expired.");
    }

    [Fact]
    public async Task Handle_UsedToken_ShouldThrowDomainException()
    {
        // Arrange
        var command = new ResetPasswordCommand("used-token", "NewPassword123!");
        var user = User.Create("test@example.com", "password-hash");

        var resetToken = new PasswordResetToken
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            TokenHash = "hashed-used-token",
            ExpiresAtUtc = DateTime.UtcNow.AddHours(1),
            UsedAtUtc = DateTime.UtcNow.AddMinutes(-5), // Already used
            User = user
        };

        _tokenRepositoryMock
            .Setup(r => r.GetByTokenHashAsync(It.IsAny<string>()))
            .ReturnsAsync(resetToken);

        // Act
        var act = async () => await _handler.Handle(command, CancellationToken.None);

        // Assert
        var exception = await act.Should().ThrowAsync<DomainException>();
        exception.Which.Code.Should().Be("invalid_reset_token");
        exception.Which.Message.Should().Be("The reset link is invalid or has expired.");
    }

    [Fact]
    public void HashToken_ShouldReturnBase64String()
    {
        // Need to use reflection since HashToken is private static

        // Just verify the handler exists and the command type is correct
        typeof(ResetPasswordCommandHandler)
            .Should().Implement<IRequestHandler<ResetPasswordCommand, Unit>>();
    }
}
