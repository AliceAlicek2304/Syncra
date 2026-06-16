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

            try
            {
                await _zernioClient.UnpublishPostAsync(post.ZernioPostId, request.Platform, cancellationToken);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to unpublish post {PostId} from platform {Platform}, but proceeding with database updates.", post.ZernioPostId, request.Platform);
            }

            if (request.DeleteFromDb)
            {
                post.MarkAsDeleted();
            }
            else
            {
                var utcNow = DateTime.UtcNow;
                var target = post.PlatformTargets.FirstOrDefault(t => 
                    string.Equals(t.Platform, request.Platform, StringComparison.OrdinalIgnoreCase));
                
                if (target != null)
                {
                    target.MarkFailed("Unpublished from platform", utcNow);
                }

                if (post.PlatformTargets.All(t => t.Status == PostPlatformStatus.Failed))
                {
                    post.MarkAsUnpublished(utcNow);
                }
            }
            await _unitOfWork.SaveChangesAsync(cancellationToken);
        }
        else
        {
            try
            {
                await _zernioClient.UnpublishPostAsync(request.ZernioPostId, request.Platform, cancellationToken);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to unpublish dynamic post {PostId} from platform {Platform}.", request.ZernioPostId, request.Platform);
            }
        }

        return true;
    }
}
