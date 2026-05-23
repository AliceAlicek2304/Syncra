using MediatR;

namespace Syncra.Application.Features.Inbox.Commands;

public record MarkReviewReadCommand(
    Guid WorkspaceId,
    Guid ReviewId
) : IRequest<bool>;
