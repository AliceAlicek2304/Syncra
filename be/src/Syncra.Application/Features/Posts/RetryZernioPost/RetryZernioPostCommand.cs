using MediatR;
using Syncra.Application.DTOs.Posts;
using System;

namespace Syncra.Application.Features.Posts.RetryZernioPost;

public record RetryZernioPostCommand(Guid WorkspaceId, Guid PostId) : IRequest<PostDto?>;
