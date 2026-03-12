using Syncra.Application.DTOs.Posts;
using Syncra.Application.Interfaces;
using Syncra.Application.Repositories;
using Syncra.Domain.Entities;
using Syncra.Domain.Enums;

namespace Syncra.Application.Services;

public sealed class PostService : IPostService
{
    private readonly IPostRepository _postRepository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IPublishService _publishService;

    public PostService(
        IPostRepository postRepository,
        IUnitOfWork unitOfWork,
        IPublishService publishService)
    {
        _postRepository = postRepository;
        _unitOfWork = unitOfWork;
        _publishService = publishService;
    }

    public async Task<PostDto> CreatePostAsync(
        Guid workspaceId,
        Guid userId,
        CreatePostDto dto,
        CancellationToken cancellationToken = default)
    {
        var now = DateTime.UtcNow;

        var post = new Post
        {
            WorkspaceId = workspaceId,
            UserId = userId,
            Title = dto.Title,
            Content = dto.Content,
            ScheduledAtUtc = dto.ScheduledAtUtc,
            Status = dto.ScheduledAtUtc.HasValue && dto.ScheduledAtUtc.Value > now
                ? PostStatus.Scheduled
                : PostStatus.Draft,
            IntegrationId = dto.IntegrationId
        };

        await _postRepository.AddAsync(post);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return MapToDto(post);
    }

    public async Task<PostDto?> GetPostByIdAsync(
        Guid workspaceId,
        Guid postId,
        CancellationToken cancellationToken = default)
    {
        var post = await _postRepository.GetByIdAsync(postId);
        if (post is null || post.WorkspaceId != workspaceId)
        {
            return null;
        }

        return MapToDto(post);
    }

    public async Task<IReadOnlyList<PostDto>> GetPostsAsync(
        Guid workspaceId,
        string? status = default,
        DateTime? scheduledFromUtc = default,
        DateTime? scheduledToUtc = default,
        int page = 1,
        int pageSize = 20,
        CancellationToken cancellationToken = default)
    {
        if (page <= 0) page = 1;
        if (pageSize <= 0) pageSize = 20;

        var posts = await _postRepository.GetByWorkspaceIdAsync(workspaceId);

        var query = posts.AsQueryable();

        if (!string.IsNullOrWhiteSpace(status) &&
            Enum.TryParse<PostStatus>(status, ignoreCase: true, out var parsedStatus))
        {
            query = query.Where(p => p.Status == parsedStatus);
        }

        if (scheduledFromUtc.HasValue)
        {
            query = query.Where(p => p.ScheduledAtUtc >= scheduledFromUtc.Value);
        }

        if (scheduledToUtc.HasValue)
        {
            query = query.Where(p => p.ScheduledAtUtc <= scheduledToUtc.Value);
        }

        query = query
            .OrderByDescending(p => p.CreatedAtUtc)
            .ThenByDescending(p => p.ScheduledAtUtc);

        var skip = (page - 1) * pageSize;
        var pageItems = query.Skip(skip).Take(pageSize).ToList();

        return pageItems.Select(MapToDto).ToList();
    }

    public async Task<PostDto?> UpdatePostAsync(
        Guid workspaceId,
        Guid postId,
        Guid userId,
        UpdatePostDto dto,
        CancellationToken cancellationToken = default)
    {
        var post = await _postRepository.GetByIdAsync(postId);
        if (post is null || post.WorkspaceId != workspaceId)
        {
            return null;
        }

        post.Title = dto.Title;
        post.Content = dto.Content;
        post.ScheduledAtUtc = dto.ScheduledAtUtc;
        post.IntegrationId = dto.IntegrationId;

        if (!string.IsNullOrWhiteSpace(dto.Status) &&
            Enum.TryParse<PostStatus>(dto.Status, ignoreCase: true, out var newStatus))
        {
            post.Status = PostStatusTransitions.ApplyTransition(post.Status, newStatus);
        }

        await _postRepository.UpdateAsync(post);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return MapToDto(post);
    }

    public async Task<bool> DeletePostAsync(
        Guid workspaceId,
        Guid postId,
        CancellationToken cancellationToken = default)
    {
        var post = await _postRepository.GetByIdAsync(postId);
        if (post is null || post.WorkspaceId != workspaceId)
        {
            return false;
        }

        await _postRepository.DeleteAsync(postId);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<PostDto> PublishPostAsync(
        Guid workspaceId,
        Guid postId,
        Guid userId,
        bool dryRun = false,
        CancellationToken cancellationToken = default)
    {
        await _publishService.PublishAsync(
            workspaceId,
            postId,
            userId,
            dryRun,
            cancellationToken);

        var post = await _postRepository.GetByIdAsync(postId);
        if (post is null || post.WorkspaceId != workspaceId)
        {
            throw new InvalidOperationException("Post not found in the specified workspace.");
        }

        return MapToDto(post);
    }

    private static PostDto MapToDto(Post post) =>
        new(
            post.Id,
            post.WorkspaceId,
            post.UserId,
            post.Title,
            post.Content,
            post.Status.ToString(),
            post.ScheduledAtUtc,
            post.PublishedAtUtc,
            post.IntegrationId);
}

