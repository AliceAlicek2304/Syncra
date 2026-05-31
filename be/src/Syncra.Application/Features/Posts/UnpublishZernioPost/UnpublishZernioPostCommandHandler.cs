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

            await UnpublishFromPlatforms(post, cancellationToken);

            if (request.DeleteFromDb)
            {
                post.MarkAsDeleted();
            }
            else
            {
                var utcNow = DateTime.UtcNow;
                post.MarkAsUnpublished(utcNow);
                foreach (var platformTarget in post.PlatformTargets.Where(pt => pt.Status == PostPlatformStatus.Published))
                {
                    platformTarget.MarkFailed("Unpublished from platform", utcNow);
                }
            }
            await _unitOfWork.SaveChangesAsync(cancellationToken);
        }

        return true;
    }

    private async Task UnpublishFromPlatforms(Post post, CancellationToken cancellationToken)
    {
        var publishedPlatforms = post.PlatformTargets
            .Where(pt => pt.Status == PostPlatformStatus.Published)
            .ToList();

        foreach (var platformTarget in publishedPlatforms)
        {
            await _zernioClient.UnpublishPostAsync(post.ZernioPostId, platformTarget.Platform, cancellationToken);
        }
    }
}
