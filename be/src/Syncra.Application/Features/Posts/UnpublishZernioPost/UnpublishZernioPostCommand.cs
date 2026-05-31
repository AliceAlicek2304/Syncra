using MediatR;
using System;

namespace Syncra.Application.Features.Posts.UnpublishZernioPost;

public record UnpublishZernioPostCommand(Guid WorkspaceId, string ZernioPostId, bool DeleteFromDb = true) : IRequest<bool>;
