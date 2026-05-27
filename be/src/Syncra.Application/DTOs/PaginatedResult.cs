namespace Syncra.Application.DTOs;

/// <summary>
/// Generic paged response wrapper returned by all list endpoints.
/// </summary>
public sealed record PaginatedResult<T>(
    IReadOnlyList<T> Items,
    int Page,
    int PageSize,
    int TotalItems,
    int TotalPages);
