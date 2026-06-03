using MediatR;
using Syncra.Domain.Interfaces;

namespace Syncra.Application.Features.Ideas.Commands;

public sealed record ReorderIdeasCommand(
    Guid WorkspaceId,
    IReadOnlyList<Guid> OrderedIds
) : IRequest<bool>;

public sealed class ReorderIdeasCommandHandler : IRequestHandler<ReorderIdeasCommand, bool>
{
    private readonly IIdeaRepository _ideaRepository;
    private readonly IUnitOfWork _unitOfWork;

    public ReorderIdeasCommandHandler(IIdeaRepository ideaRepository, IUnitOfWork unitOfWork)
    {
        _ideaRepository = ideaRepository;
        _unitOfWork = unitOfWork;
    }

    public async Task<bool> Handle(ReorderIdeasCommand request, CancellationToken cancellationToken)
    {
        var ideas = await _ideaRepository.GetByIdsAsync(request.OrderedIds);

        // Scope-check: every idea must belong to the requesting workspace.
        if (ideas.Any(i => i.WorkspaceId != request.WorkspaceId))
        {
            return false;
        }

        for (var i = 0; i < request.OrderedIds.Count; i++)
        {
            var idea = ideas.FirstOrDefault(x => x.Id == request.OrderedIds[i]);
            if (idea is null) continue;
            idea.SetPosition(i);
            await _ideaRepository.UpdateAsync(idea);
        }

        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return true;
    }
}
