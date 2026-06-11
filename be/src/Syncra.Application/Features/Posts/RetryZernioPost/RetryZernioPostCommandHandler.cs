using MediatR;
using Syncra.Application.DTOs.Posts;
using Syncra.Application.Interfaces;
using Syncra.Domain.Exceptions;
using Syncra.Domain.Interfaces;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace Syncra.Application.Features.Posts.RetryZernioPost;

public class RetryZernioPostCommandHandler : IRequestHandler<RetryZernioPostCommand, PostDto?>
{
    private readonly IPostRepository _postRepository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IZernioClient _zernioClient;
    private readonly IStorageService _storageService;

    public RetryZernioPostCommandHandler(
        IPostRepository postRepository,
        IUnitOfWork unitOfWork,
        IZernioClient zernioClient,
        IStorageService storageService)
    {
        _postRepository = postRepository;
        _unitOfWork = unitOfWork;
        _zernioClient = zernioClient;
        _storageService = storageService;
    }

    public async Task<PostDto?> Handle(RetryZernioPostCommand request, CancellationToken cancellationToken)
    {
        var post = await _postRepository.GetByIdWithPlatformTargetsAsync(request.PostId);

        if (post == null || post.WorkspaceId != request.WorkspaceId)
            return null;

        if (string.IsNullOrEmpty(post.ZernioPostId))
        {
            throw new DomainException("not_a_zernio_post", "Cannot retry a non-Zernio post via this endpoint.");
        }

        foreach (var target in post.PlatformTargets.Where(t => t.CanRetry))
        {
            target.ResetForRetry();
        }

        post.StartZernioRetry();

        await _zernioClient.RetryPostAsync(post.ZernioPostId, cancellationToken);

        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return PostMapper.ToDto(post, _storageService);
    }
}
