#if FALSE
using Moq;
using Syncra.Application.Features.Auth.Commands;
using Syncra.Application.Interfaces;
using Syncra.Application.Common.Interfaces;
using Syncra.Domain.Interfaces;
using Syncra.Domain.Entities;
using Syncra.Domain.Exceptions;
using BC = BCrypt.Net.BCrypt;
using Xunit;

namespace Syncra.UnitTests.Application.Auth;

public class LoginCommandHandlerTests
{
    private readonly Mock<IUserRepository> _userRepositoryMock;
    private readonly Mock<IRefreshTokenRepository> _refreshTokenRepositoryMock;
    private readonly Mock<IUserSessionRepository> _userSessionRepositoryMock;
    private readonly Mock<IUnitOfWork> _unitOfWorkMock;
    private readonly Mock<ITokenService> _tokenServiceMock;
    private readonly Mock<IJwtOptions> _jwtOptionsMock;
    private readonly LoginCommandHandler _handler;

    public LoginCommandHandlerTests()
    {
        _userRepositoryMock = new Mock<IUserRepository>();
        _refreshTokenRepositoryMock = new Mock<IRefreshTokenRepository>();
        _userSessionRepositoryMock = new Mock<IUserSessionRepository>();
        _unitOfWorkMock = new Mock<IUnitOfWork>();
        _tokenServiceMock = new Mock<ITokenService>();
        _jwtOptionsMock = new Mock<IJwtOptions>();

        _jwtOptionsMock.Setup(o => o.RefreshTokenExpirationDays).Returns(7);

        _handler = new LoginCommandHandler(
            _userRepositoryMock.Object,
            _refreshTokenRepositoryMock.Object,
            _userSessionRepositoryMock.Object,
            _unitOfWorkMock.Object,
            _tokenServiceMock.Object,
            _jwtOptionsMock.Object);
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

        _tokenServiceMock.Setup(s => s.GenerateJwtToken(user))
            .Returns("access-token");
        _tokenServiceMock.Setup(s => s.GenerateRefreshToken())
            .Returns("refresh-token");

        _userSessionRepositoryMock.Setup(r => r.AddAsync(It.IsAny<UserSession>()))
            .Returns(Task.CompletedTask);
        _refreshTokenRepositoryMock.Setup(r => r.AddAsync(It.IsAny<RefreshToken>()))
            .Returns(Task.CompletedTask);
        _unitOfWorkMock.Setup(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(1);

        // Act
        var result = await _handler.Handle(command, CancellationToken.None);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(user.Id, result.UserId);
        Assert.Equal("access-token", result.AccessToken);
        Assert.Equal("refresh-token", result.RefreshToken);
        
        _userSessionRepositoryMock.Verify(r => r.AddAsync(It.IsAny<UserSession>()), Times.Once);
        _refreshTokenRepositoryMock.Verify(r => r.AddAsync(It.IsAny<RefreshToken>()), Times.Once);
        _unitOfWorkMock.Verify(u => u.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
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
#endif
