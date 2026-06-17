using System;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using Microsoft.Extensions.Logging;
using Syncra.Application.Interfaces;
using Syncra.Domain.Interfaces;

namespace Syncra.Application.Features.Posts.Commands;

public sealed class DeletePostCommandHandler : IRequestHandler<DeletePostCommand, bool>
{
    private readonly IPostRepository _postRepository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IZernioClient _zernioClient;
    private readonly ILogger<DeletePostCommandHandler> _logger;

    public DeletePostCommandHandler(
        IPostRepository postRepository,
        IUnitOfWork unitOfWork,
        IZernioClient zernioClient,
        ILogger<DeletePostCommandHandler> logger)
    {
        _postRepository = postRepository;
        _unitOfWork = unitOfWork;
        _zernioClient = zernioClient;
        _logger = logger;
    }

    public async Task<bool> Handle(DeletePostCommand request, CancellationToken cancellationToken)
    {
        var post = await _postRepository.GetByIdAsync(request.PostId);
        if (post is null || post.WorkspaceId != request.WorkspaceId)
        {
            return false;
        }

        if (!string.IsNullOrEmpty(post.ZernioPostId))
        {
            try
            {
                await _zernioClient.DeletePostAsync(post.ZernioPostId, cancellationToken);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to delete post {PostId} from Zernio, but proceeding with database deletion.", post.ZernioPostId);
            }
        }

        // Hard delete from database
        await _postRepository.DeleteAsync(post.Id);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return true;
    }
}