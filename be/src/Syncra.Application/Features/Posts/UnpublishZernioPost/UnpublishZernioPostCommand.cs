using MediatR;
using System;

namespace Syncra.Application.Features.Posts.UnpublishZernioPost;

public record UnpublishZernioPostCommand(Guid WorkspaceId, string ZernioPostId, string Platform, bool DeleteFromDb = true) : IRequest<bool>;
