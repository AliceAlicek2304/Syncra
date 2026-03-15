using Moq;
using Syncra.Application.Features.Auth.Commands;
using Syncra.Application.Repositories;
using Syncra.Domain.Entities;
using Syncra.Domain.Exceptions;
using BC = BCrypt.Net.BCrypt;
using Xunit;

namespace Syncra.UnitTests.Application.Auth;

public class RegisterCommandHandlerTests
{
    private readonly Mock<IUserRepository> _userRepositoryMock;
    private readonly Mock<ISessionRepository> _sessionRepositoryMock;
    private readonly RegisterCommandHandler _handler;

    public RegisterCommandHandlerTests()
    {
        _userRepositoryMock = new Mock<IUserRepository>();
        _sessionRepositoryMock = new Mock<ISessionRepository>();
        _handler = new RegisterCommandHandler(_userRepositoryMock.Object, _sessionRepositoryMock.Object);
    }

    [Fact]
    public async Task Handle_ValidCommand_CreatesUserSuccessfully()
    {
        // Arrange
        var command = new RegisterCommand
        {
            Email = "test@example.com",
            Password = "SecurePass123!",
            FirstName = "Test",
            LastName = "User"
        };

        User? capturedUser = null;
        _userRepositoryMock.Setup(r => r.AddAsync(It.IsAny<User>()))
            .Callback<User>(u => capturedUser = u)
            .Returns(Task.CompletedTask);

        _userRepositoryMock.Setup(r => r.GetByEmailAsync(command.Email, It.IsAny<CancellationToken>()))
            .ReturnsAsync((User?)null);

        _sessionRepositoryMock.Setup(r => r.AddAsync(It.IsAny<Session>()))
            .Returns(Task.CompletedTask);

        _userRepositoryMock.Setup(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);

        // Act
        var result = await _handler.Handle(command, CancellationToken.None);

        // Assert
        Assert.NotNull(result);
        Assert.NotEqual(Guid.Empty, result.UserId);
        Assert.NotNull(capturedUser);
        Assert.Equal(command.Email, capturedUser!.Email.Value);
    }

    [Fact]
    public async Task Handle_ExistingEmail_ThrowsDomainException()
    {
        // Arrange
        var command = new RegisterCommand
        {
            Email = "existing@example.com",
            Password = "SecurePass123!",
            FirstName = "Test",
            LastName = "User"
        };

        _userRepositoryMock.Setup(r => r.GetByEmailAsync(command.Email, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new User("test", BC.HashPassword("test")));

        // Act & Assert
        await Assert.ThrowsAsync<DomainException>(() =>
            _handler.Handle(command, CancellationToken.None));
    }

    [Fact]
    public async Task Handle_WeakPassword_ThrowsValidationException()
    {
        // Arrange
        var command = new RegisterCommand
        {
            Email = "test@example.com",
            Password = "weak",
            FirstName = "Test",
            LastName = "User"
        };

        // Act & Assert
        await Assert.ThrowsAsync<DomainException>(() =>
            _handler.Handle(command, CancellationToken.None));
    }

    [Fact]
    public async Task Handle_InvalidEmail_ThrowsValidationException()
    {
        // Arrange
        var command = new RegisterCommand
        {
            Email = "not-an-email",
            Password = "SecurePass123!",
            FirstName = "Test",
            LastName = "User"
        };

        // Act & Assert
        await Assert.ThrowsAsync<DomainException>(() =>
            _handler.Handle(command, CancellationToken.None));
    }
}