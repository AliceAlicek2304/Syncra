using MediatR;
using Syncra.Application.DTOs.Posts;

namespace Syncra.Application.Features.Posts.Queries;

public record GetPostByIdQuery(
    Guid WorkspaceId,
    Guid PostId
) : IRequest<PostDto?>;