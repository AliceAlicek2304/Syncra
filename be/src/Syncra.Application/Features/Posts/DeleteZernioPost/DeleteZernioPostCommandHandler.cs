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
        var post = await _postRepository.GetByZernioPostIdAsync(request.ZernioPostId);

        if (post != null)
        {
            if (post.WorkspaceId != request.WorkspaceId)
                return false;

            if (post.Status is PostStatus.Scheduled or PostStatus.Draft or PostStatus.Publishing or PostStatus.Published)
            {
                if (!string.IsNullOrEmpty(post.ZernioPostId))
                {
                    await _zernioClient.DeletePostAsync(post.ZernioPostId, cancellationToken);
                }
            }

            post.MarkAsDeleted();
            await _unitOfWork.SaveChangesAsync(cancellationToken);
        }
        else
        {
            // If the post does not exist in our database, it is a dynamic post.
            // We call the Zernio client directly to delete it from Zernio.
            await _zernioClient.DeletePostAsync(request.ZernioPostId, cancellationToken);
        }

        return true;
    }
}
