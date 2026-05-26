using MediatR;
using System;

namespace Syncra.Application.Features.Posts.DeleteZernioPost;

public record DeleteZernioPostCommand(Guid WorkspaceId, string ZernioPostId) : IRequest<bool>;
