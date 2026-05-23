using MediatR;
using Syncra.Application.Interfaces;
using Syncra.Domain.Enums;
using Syncra.Domain.Exceptions;
using Syncra.Domain.Interfaces;
using System.Threading;
using System.Threading.Tasks;

namespace Syncra.Application.Features.Posts.DeleteZernioPost;

public class DeleteZernioPostCommandHandler : IRequestHandler<DeleteZernioPostCommand, bool>
{
    private readonly IPostRepository _postRepository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IZernioClient _zernioClient;

    public DeleteZernioPostCommandHandler(IPostRepository postRepository, IUnitOfWork unitOfWork, IZernioClient zernioClient)
    {
        _postRepository = postRepository;
        _unitOfWork = unitOfWork;
        _zernioClient = zernioClient;
    }

    public async Task<bool> Handle(DeleteZernioPostCommand request, CancellationToken cancellationToken)
    {
        var post = await _postRepository.GetByIdAsync(request.PostId);

        if (post == null || post.WorkspaceId != request.WorkspaceId)
            return false;

        if (post.Status is PostStatus.Scheduled or PostStatus.Draft or PostStatus.Publishing)
        {
            if (!string.IsNullOrEmpty(post.ZernioPostId))
            {
                await _zernioClient.DeletePostAsync(post.ZernioPostId, cancellationToken);
            }
        }

        post.MarkAsDeleted();

        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return true;
    }
}
