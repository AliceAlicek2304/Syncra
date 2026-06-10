namespace Syncra.Application.Interfaces;

public interface IWebScraperService
{
    Task<(string Title, string Content)> FetchUrlContentAsync(string url, CancellationToken ct = default);
}
