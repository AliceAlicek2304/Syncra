namespace Syncra.Application.Interfaces;

public interface IPaymentProviderResolver
{
    IPaymentProvider GetRequiredProvider(string providerKey);
    string GetDefaultProviderKey();
}
