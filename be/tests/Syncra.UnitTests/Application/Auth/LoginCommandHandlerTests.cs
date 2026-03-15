using Moq;
using Syncra.Application.Features.Auth.Commands;
using Syncra.Application.Repositories;
using Syncra.Domain.Entities;
using Syncra.Domain.Exceptions;
using BC = BCrypt.Net.BCrypt;
using Xunit;

namespace Syncra.UnitTests.Application.Auth;

public class LoginCommandHandlerTests
{
    private readonly Mock<IUserRepository> _userRepositoryMock;
    private readonly Mock<ISessionRepository> _sessionRepositoryMock;
    private readonly LoginCommandHandler _handler;

    public LoginCommandHandlerTests()
    {
        _userRepositoryMock = new Mock<IUserRepository>();
        _sessionRepositoryMock = new Mock<ISessionRepository>();
        _handler = new LoginCommandHandler(_userRepositoryMock.Object, _sessionRepositoryMock.Object);
    }

    [Fact]
    public async Task Handle_ValidCredentials_ReturnsAuthResponse()
    {
        // Arrange
        var password = "SecurePass123!";
        var user = User.Create("test@example.com", BC.HashPassword(password));

        var command = new LoginCommand
        {
            Email = "test@example.com",
            Password = password
        };

        _userRepositoryMock.Setup(r => r.GetByEmailAsync(command.Email, It.IsAny<CancellationToken>()))
            .ReturnsAsync(user);

        _sessionRepositoryMock.Setup(r => r.AddAsync(It.IsAny<Session>()))
            .Returns(Task.CompletedTask);

        _userRepositoryMock.Setup(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);

        // Act
        var result = await _handler.Handle(command, CancellationToken.None);

        // Assert
        Assert.NotNull(result);
        Assert.NotEqual(Guid.Empty, result.UserId);
        Assert.NotNull(result.AccessToken);
        Assert.NotNull(result.RefreshToken);
    }

    [Fact]
    public async Task Handle_WrongPassword_ThrowsDomainException()
    {
        // Arrange
        var user = User.Create("test@example.com", BC.HashPassword("CorrectPassword123!"));

        var command = new LoginCommand
        {
            Email = "test@example.com",
            Password = "WrongPassword"
        };

        _userRepositoryMock.Setup(r => r.GetByEmailAsync(command.Email, It.IsAny<CancellationToken>()))
            .ReturnsAsync(user);

        // Act & Assert
        await Assert.ThrowsAsync<DomainException>(() =>
            _handler.Handle(command, CancellationToken.None));
    }

    [Fact]
    public async Task Handle_NonExistentUser_ThrowsDomainException()
    {
        // Arrange
        var command = new LoginCommand
        {
            Email = "nonexistent@example.com",
            Password = "SomePassword123!"
        };

        _userRepositoryMock.Setup(r => r.GetByEmailAsync(command.Email, It.IsAny<CancellationToken>()))
            .ReturnsAsync((User?)null);

        // Act & Assert
        await Assert.ThrowsAsync<DomainException>(() =>
            _handler.Handle(command, CancellationToken.None));
    }
}