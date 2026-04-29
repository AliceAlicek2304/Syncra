using Moq;
using Syncra.Application.Features.Subscriptions.Commands;
using Syncra.Domain.Entities;
using Syncra.Domain.Interfaces;
using Xunit;

namespace Syncra.UnitTests.Application.Subscriptions;

public sealed class UpdateSubscriptionCommandHandlerTests
{
    [Fact]
    public async Task Stores_provider_aware_fields_on_create()
    {
        var subscriptionRepositoryMock = new Mock<ISubscriptionRepository>();
        var unitOfWorkMock = new Mock<IUnitOfWork>();

        Subscription? captured = null;
        subscriptionRepositoryMock
            .Setup(x => x.GetByWorkspaceIdAsync(It.IsAny<Guid>()))
            .ReturnsAsync((Subscription?)null);
        subscriptionRepositoryMock
            .Setup(x => x.AddAsync(It.IsAny<Subscription>()))
            .Callback<Subscription>(s => captured = s)
            .Returns(Task.CompletedTask);

        var sut = new UpdateSubscriptionCommandHandler(subscriptionRepositoryMock.Object, unitOfWorkMock.Object);

        await sut.Handle(
            new UpdateSubscriptionCommand("stripe", Guid.NewGuid().ToString(), "sub_123", "cus_123"),
            CancellationToken.None);

        Assert.NotNull(captured);
        Assert.Equal("sub_123", captured!.ProviderSubscriptionId);
        Assert.Equal("cus_123", captured.ProviderCustomerId);
        Assert.Equal("stripe", captured.Provider);
    }
}
