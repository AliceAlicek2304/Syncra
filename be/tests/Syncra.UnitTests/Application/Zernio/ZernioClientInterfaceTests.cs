using System.Reflection;
using Syncra.Application.DTOs.Zernio;
using Syncra.Application.Interfaces;
using Xunit;

namespace Syncra.UnitTests.Application.Zernio;

public class ZernioClientInterfaceTests
{
    [Fact]
    public void IZernioClient_ShouldDeclareCreatePostAsync()
    {
        // Arrange
        var interfaceType = typeof(IZernioClient);
        var method = interfaceType.GetMethod("CreatePostAsync");

        // Assert
        Assert.NotNull(method);
        Assert.True(method!.ReturnType.IsGenericType);
        Assert.Equal(typeof(Task<>), method!.ReturnType.GetGenericTypeDefinition());
        Assert.Equal(typeof(ZernioCreatePostResult), method!.ReturnType.GenericTypeArguments[0]);

        var parameters = method.GetParameters();
        Assert.Contains(parameters, p => p.Name == "request" && p.ParameterType == typeof(ZernioCreatePostRequest));
        Assert.Contains(parameters, p => p.Name == "cancellationToken" && p.ParameterType == typeof(CancellationToken));
    }

    [Fact]
    public void IZernioClient_ShouldNotAddExtraZernioPostMethods()
    {
        // Arrange
        var interfaceType = typeof(IZernioClient);
        var methods = interfaceType.GetMethods(BindingFlags.Instance | BindingFlags.Public | BindingFlags.DeclaredOnly);

        // Only the existing methods + CreatePostAsync should be present
        // RetryPostAsync and DeletePostAsync are added in plan 26-04 per D-04
        var methodNames = methods.Select(m => m.Name).ToHashSet();

        // This plan adds only CreatePostAsync
        var existingMethods = new[]
        {
            "GetConnectUrlAsync",
            "ListAccountsAsync",
            "DisconnectAccountAsync",
            "ProvisionProfileAsync",
            "ListSelectOptionsAsync",
            "SelectOptionAsync",
            "CreatePostAsync"
        };

        foreach (var name in existingMethods)
        {
            Assert.Contains(name, methodNames);
        }

        Assert.DoesNotContain("RetryPostAsync", methodNames);
        Assert.DoesNotContain("DeletePostAsync", methodNames);
    }
}
