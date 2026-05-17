using System.Reflection;
using FluentAssertions;
using Moq;
using Xunit;
using Syncra.Application.Interfaces;
using Syncra.Domain.Entities;

namespace Syncra.UnitTests.Application.Options;

public class EmailServiceTests
{
    [Fact]
    public void IEmailService_ShouldRequireSendPasswordResetEmailAsyncMethod()
    {
        // Arrange
        var interfaceType = typeof(IEmailService);

        // Act
        var methods = interfaceType.GetMethods(BindingFlags.Instance | BindingFlags.Public | BindingFlags.DeclaredOnly);

        // Assert
        methods.Should().ContainSingle(m =>
            m.Name == "SendPasswordResetEmailAsync" &&
            m.ReturnType == typeof(Task) &&
            m.GetParameters().Length == 3 &&
            m.GetParameters()[0].ParameterType == typeof(User) &&
            m.GetParameters()[1].ParameterType == typeof(string) &&
            m.GetParameters()[2].ParameterType == typeof(CancellationToken));
    }

    [Fact]
    public async Task IEmailService_SendPasswordResetEmailAsync_ShouldBeCallable()
    {
        // Arrange
        var mock = new Mock<IEmailService>(MockBehavior.Strict);
        var user = User.Create("test@example.com", "hash");
        var token = "test-token";
        var ct = CancellationToken.None;

        mock.Setup(s => s.SendPasswordResetEmailAsync(user, token, ct))
            .Returns(Task.CompletedTask)
            .Verifiable();

        // Act
        await mock.Object.SendPasswordResetEmailAsync(user, token, ct);

        // Assert
        mock.Verify();
    }
}
