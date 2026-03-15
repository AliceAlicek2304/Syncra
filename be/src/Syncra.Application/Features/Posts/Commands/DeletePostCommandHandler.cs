using MediatR;
using Syncra.Domain.Interfaces;

namespace Syncra.Application.Features.Posts.Commands;

public sealed class DeletePostCommandHandler : IRequestHandler<DeletePostCommand, bool>
{
    private readonly IPostRepository _postRepository;
    private readonly IUnitOfWork _unitOfWork;

    public DeletePostCommandHandler(
        IPostRepository postRepository,
        IUnitOfWork unitOfWork)
    {
        _postRepository = postRepository;
        _unitOfWork = unitOfWork;
    }

    public async Task<bool> Handle(DeletePostCommand request, CancellationToken cancellationToken)
    {
        var post = await _postRepository.GetByIdAsync(request.PostId);
        if (post is null || post.WorkspaceId != request.WorkspaceId)
        {
            return false;
        }

        // Use domain entity soft delete behavior
        post.MarkAsDeleted();

        await _postRepository.UpdateAsync(post);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return true;
    }
}