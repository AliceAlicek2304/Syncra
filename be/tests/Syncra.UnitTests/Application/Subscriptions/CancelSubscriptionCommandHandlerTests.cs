using Moq;
using Syncra.Application.Features.Subscriptions.Commands;
using Syncra.Domain.Entities;
using Syncra.Domain.Interfaces;
using Xunit;

namespace Syncra.UnitTests.Application.Subscriptions;

public sealed class CancelSubscriptionCommandHandlerTests
{
    [Fact]
    public async Task Uses_GetByProviderSubscriptionIdAsync_to_cancel_matching_subscription()
    {
        var subscriptionRepositoryMock = new Mock<ISubscriptionRepository>();
        var unitOfWorkMock = new Mock<IUnitOfWork>();

        var subscription = new Subscription
        {
            Provider = "stripe",
            ProviderSubscriptionId = "sub_123",
            Status = Syncra.Domain.Enums.SubscriptionStatus.Active
        };

        subscriptionRepositoryMock
            .Setup(x => x.GetByProviderSubscriptionIdAsync("stripe", "sub_123"))
            .ReturnsAsync(subscription);

        var sut = new CancelSubscriptionCommandHandler(subscriptionRepositoryMock.Object, unitOfWorkMock.Object);

        await sut.Handle(new CancelSubscriptionCommand("stripe", "sub_123"), CancellationToken.None);

        Assert.Equal(Syncra.Domain.Enums.SubscriptionStatus.Canceled, subscription.Status);
        subscriptionRepositoryMock.Verify(x => x.GetByProviderSubscriptionIdAsync("stripe", "sub_123"), Times.Once);
    }
}
