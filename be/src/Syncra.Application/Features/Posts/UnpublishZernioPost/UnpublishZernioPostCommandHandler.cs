using MediatR;
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

    public UnpublishZernioPostCommandHandler(IPostRepository postRepository, IUnitOfWork unitOfWork, IZernioClient zernioClient)
    {
        _postRepository = postRepository;
        _unitOfWork = unitOfWork;
        _zernioClient = zernioClient;
    }

    public async Task<bool> Handle(UnpublishZernioPostCommand request, CancellationToken cancellationToken)
    {
        var post = await _postRepository.GetByZernioPostIdAsync(request.ZernioPostId);

        if (post != null)
        {
            if (post.WorkspaceId != request.WorkspaceId)
                return false;

            await _zernioClient.UnpublishPostAsync(post.ZernioPostId, request.Platform, cancellationToken);

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
            await _zernioClient.UnpublishPostAsync(request.ZernioPostId, request.Platform, cancellationToken);
        }

        return true;
    }
}
