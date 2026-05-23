using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

namespace Syncra.Application.Interfaces;

public interface IPostStatusNotifier
{
    Task NotifyAsync(
        Guid workspaceId,
        Guid postId,
        string status,
        int zernioTargetCount,
        IReadOnlyList<PostStatusTargetPayload> platformTargets,
        CancellationToken cancellationToken = default);
}

public sealed record PostStatusTargetPayload(
    Guid Id,
    string Platform,
    string Status,
    string? ExternalPostUrl,
    string? ErrorMessage,
    string? ZernioAccountId);
