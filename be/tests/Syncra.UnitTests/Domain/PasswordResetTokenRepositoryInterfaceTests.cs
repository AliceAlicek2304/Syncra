using Syncra.Domain.Entities;
using Syncra.Domain.Interfaces;
using Xunit;

namespace Syncra.UnitTests.Domain;

public class PasswordResetTokenRepositoryInterfaceTests
{
    [Fact]
    public void Interface_ShouldDefineExpectedMethods()
    {
        // Arrange - verify the interface type exists and has expected methods
        var interfaceType = typeof(IPasswordResetTokenRepository);

        // Assert - GetByIdAsync
        var getByIdMethod = interfaceType.GetMethod("GetByIdAsync");
        Assert.NotNull(getByIdMethod);
        Assert.Equal(typeof(Task<PasswordResetToken?>), getByIdMethod.ReturnType);
        Assert.Single(getByIdMethod.GetParameters());
        Assert.Equal(typeof(Guid), getByIdMethod.GetParameters()[0].ParameterType);

        // Assert - GetByIdsAsync
        var getByIdsMethod = interfaceType.GetMethod("GetByIdsAsync");
        Assert.NotNull(getByIdsMethod);
        Assert.Equal(typeof(Task<IReadOnlyList<PasswordResetToken>>), getByIdsMethod.ReturnType);

        // Assert - AddAsync
        var addMethod = interfaceType.GetMethod("AddAsync");
        Assert.NotNull(addMethod);
        Assert.Equal(typeof(Task), addMethod.ReturnType);
        Assert.Single(addMethod.GetParameters());
        Assert.Equal(typeof(PasswordResetToken), addMethod.GetParameters()[0].ParameterType);

        // Assert - UpdateAsync
        var updateMethod = interfaceType.GetMethod("UpdateAsync");
        Assert.NotNull(updateMethod);
        Assert.Equal(typeof(Task), updateMethod.ReturnType);
        Assert.Single(updateMethod.GetParameters());
        Assert.Equal(typeof(PasswordResetToken), updateMethod.GetParameters()[0].ParameterType);

        // Assert - DeleteAsync
        var deleteMethod = interfaceType.GetMethod("DeleteAsync");
        Assert.NotNull(deleteMethod);
        Assert.Equal(typeof(Task), deleteMethod.ReturnType);
        Assert.Single(deleteMethod.GetParameters());
        Assert.Equal(typeof(Guid), deleteMethod.GetParameters()[0].ParameterType);

        // Assert - GetByTokenHashAsync
        var getByHashMethod = interfaceType.GetMethod("GetByTokenHashAsync");
        Assert.NotNull(getByHashMethod);
        Assert.Equal(typeof(Task<PasswordResetToken?>), getByHashMethod.ReturnType);
        Assert.Single(getByHashMethod.GetParameters());
        Assert.Equal(typeof(string), getByHashMethod.GetParameters()[0].ParameterType);

        // Assert - MarkAsUsedAsync
        var markAsUsedMethod = interfaceType.GetMethod("MarkAsUsedAsync");
        Assert.NotNull(markAsUsedMethod);
        Assert.Equal(typeof(Task), markAsUsedMethod.ReturnType);
        Assert.Single(markAsUsedMethod.GetParameters());
        Assert.Equal(typeof(Guid), markAsUsedMethod.GetParameters()[0].ParameterType);
    }
}
