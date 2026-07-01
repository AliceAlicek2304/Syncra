using MediatR;
using Microsoft.Extensions.Logging;
using Syncra.Application.Interfaces;
using Syncra.Domain.Enums;
using Syncra.Domain.Interfaces;
using Syncra.Domain.Entities;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace Syncra.Application.Features.Posts.UnpublishZernioPost;

public class UnpublishZernioPostCommandHandler : IRequestHandler<UnpublishZernioPostCommand, bool>
{
    private readonly IPostRepository _postRepository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IZernioClient _zernioClient;
    private readonly ILogger<UnpublishZernioPostCommandHandler> _logger;

    public UnpublishZernioPostCommandHandler(
        IPostRepository postRepository,
        IUnitOfWork unitOfWork,
        IZernioClient zernioClient,
        ILogger<UnpublishZernioPostCommandHandler> logger)
    {
        _postRepository = postRepository;
        _unitOfWork = unitOfWork;
        _zernioClient = zernioClient;
        _logger = logger;
    }

    public async Task<bool> Handle(UnpublishZernioPostCommand request, CancellationToken cancellationToken)
    {
        var post = await _postRepository.GetByZernioPostIdAsync(request.ZernioPostId);

        if (post != null)
        {
            if (post.WorkspaceId != request.WorkspaceId)
                return false;

            // Unpublish from live platform
            await _zernioClient.UnpublishPostAsync(post.ZernioPostId, request.Platform, cancellationToken);

            if (request.DeleteFromDb)
            {
                // Delete from Zernio
                try
                {
                    await _zernioClient.DeletePostAsync(post.ZernioPostId, cancellationToken);
                }
                catch (Exception deleteEx)
                {
                    _logger.LogWarning(deleteEx, "Failed to delete post {PostId} from Zernio after successful unpublish.", post.ZernioPostId);
                }

                // Hard delete from Syncra database
                await _postRepository.DeleteAsync(post.Id);
                await _unitOfWork.SaveChangesAsync(cancellationToken);
            }
        }
        else
        {
            // Dynamic post (not in Syncra DB) - unpublish directly via Zernio
            await _zernioClient.UnpublishPostAsync(request.ZernioPostId, request.Platform, cancellationToken);

            if (request.DeleteFromDb)
            {
                try
                {
                    await _zernioClient.DeletePostAsync(request.ZernioPostId, cancellationToken);
                }
                catch (Exception deleteEx)
                {
                    _logger.LogWarning(deleteEx, "Failed to delete dynamic post {PostId} from Zernio after successful unpublish.", request.ZernioPostId);
                }
            }
        }

        return true;
    }
}
