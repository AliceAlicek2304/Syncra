using MediatR;
using Microsoft.Extensions.Logging;
using Syncra.Application.Interfaces;
using Syncra.Domain.Enums;
using Syncra.Domain.Exceptions;
using Syncra.Domain.Interfaces;
using System;
using System.Threading;
using System.Threading.Tasks;

namespace Syncra.Application.Features.Posts.DeleteZernioPost;

public class DeleteZernioPostCommandHandler : IRequestHandler<DeleteZernioPostCommand, bool>
{
    private readonly IPostRepository _postRepository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IZernioClient _zernioClient;
    private readonly ILogger<DeleteZernioPostCommandHandler> _logger;

    public DeleteZernioPostCommandHandler(
        IPostRepository postRepository,
        IUnitOfWork unitOfWork,
        IZernioClient zernioClient,
        ILogger<DeleteZernioPostCommandHandler> _logger)
    {
        _postRepository = postRepository;
        _unitOfWork = unitOfWork;
        _zernioClient = zernioClient;
        this._logger = _logger;
    }

    public async Task<bool> Handle(DeleteZernioPostCommand request, CancellationToken cancellationToken)
    {
        var post = await _postRepository.GetByZernioPostIdAsync(request.ZernioPostId);

        if (post != null)
        {
            if (post.WorkspaceId != request.WorkspaceId)
                return false;

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

            await _postRepository.DeleteAsync(post.Id);
            await _unitOfWork.SaveChangesAsync(cancellationToken);
        }
        else
        {
            // If the post does not exist in our database, it is a dynamic post.
            // We call the Zernio client directly to delete it from Zernio.
            try
            {
                await _zernioClient.DeletePostAsync(request.ZernioPostId, cancellationToken);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to delete dynamic post {PostId} from Zernio.", request.ZernioPostId);
            }
        }

        return true;
    }
}
