using Syncra.Application.DTOs.Posts;

namespace Syncra.Application.Interfaces;

public interface IPostService
{
    Task<PostDto> CreatePostAsync(
        Guid workspaceId,
        Guid userId,
        CreatePostDto dto,
        CancellationToken cancellationToken = default);

    Task<PostDto?> GetPostByIdAsync(
        Guid workspaceId,
        Guid postId,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<PostDto>> GetPostsAsync(
        Guid workspaceId,
        string? status = default,
        DateTime? scheduledFromUtc = default,
        DateTime? scheduledToUtc = default,
        int page = 1,
        int pageSize = 20,
        CancellationToken cancellationToken = default);

    Task<PostDto?> UpdatePostAsync(
        Guid workspaceId,
        Guid postId,
        Guid userId,
        UpdatePostDto dto,
        CancellationToken cancellationToken = default);

    Task<bool> DeletePostAsync(
        Guid workspaceId,
        Guid postId,
        CancellationToken cancellationToken = default);
}

