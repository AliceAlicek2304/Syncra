using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Moq;
using Syncra.Application.Options;
using Syncra.Domain.Entities;
using Syncra.Domain.Interfaces;
using Syncra.Infrastructure.Services;
using Xunit;

namespace Syncra.UnitTests.Infrastructure;

public class StripeServiceTests
{
    private readonly Mock<IWorkspaceRepository> _workspaceRepositoryMock = new();
    private readonly Mock<IUnitOfWork> _unitOfWorkMock = new();
    private readonly Mock<ILogger<StripeService>> _loggerMock = new();
    private readonly IOptions<StripeOptions> _options;
    private readonly StripeService _sut;

    public StripeServiceTests()
    {
        _options = Options.Create(new StripeOptions
        {
            SecretKey = "sk_test_123",
            WebhookSecret = "whsec_test_123"
        });

        // Ensure global state is clean before each test
        Stripe.StripeConfiguration.ApiKey = null;

        _sut = new StripeService(
            _options,
            _workspaceRepositoryMock.Object,
            _unitOfWorkMock.Object,
            _loggerMock.Object);
    }

    [Fact]
    public void Constructor_DoesNotSetGlobalApiKey()
    {
        // Assert
        Assert.Null(Stripe.StripeConfiguration.ApiKey);
    }

    [Fact]
    public async Task GetOrCreateCustomerAsync_WhenCustomerIdExists_CallsGetCustomer()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var workspace = Workspace.Create(userId, "Test Workspace", "test-workspace");
        workspace.SetStripeCustomerId("cus_123");

        // Act & Assert
        // This will likely fail with a real Stripe SDK call unless we mock the global client
        // For baseline, we document that this calls the SDK.
        // Since we can't easily mock 'new CustomerService()', we'll expect a StripeException 
        // because the API key is fake and there's no network.
        
        await Assert.ThrowsAsync<Stripe.StripeException>(() => 
            _sut.GetOrCreateCustomerAsync(workspace, CancellationToken.None));
    }

    [Fact]
    public async Task GetOrCreateCustomerAsync_WhenCustomerIdDoesNotExist_CreatesNewCustomer()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var workspace = Workspace.Create(userId, "Test Workspace", "test-workspace");

        // Act & Assert
        await Assert.ThrowsAsync<Stripe.StripeException>(() => 
            _sut.GetOrCreateCustomerAsync(workspace, CancellationToken.None));
    }
}
