using FluentValidation;
using Syncra.Application.Interfaces;
using Syncra.Domain.Interfaces;
using Syncra.Domain.ValueObjects;
using System;
using System.Threading;
using System.Threading.Tasks;

namespace Syncra.Application.Features.Posts.UpdateZernioPost;

public sealed class UpdateZernioPostCommandValidator : AbstractValidator<UpdateZernioPostCommand>
{
    private readonly IPostRepository _postRepository;

    public UpdateZernioPostCommandValidator(IPostRepository postRepository)
    {
        _postRepository = postRepository;

        RuleFor(x => x.WorkspaceId)
            .NotEmpty()
            .WithMessage("Workspace ID is required.");

        RuleFor(x => x.UserId)
            .NotEmpty()
            .WithMessage("User ID is required.");

        RuleFor(x => x.PostId)
            .NotEmpty()
            .WithMessage("Zernio post ID is required.");

        RuleFor(x => x.Title)
            .MaximumLength(PostTitle.MaxLength)
            .When(x => !string.IsNullOrEmpty(x.Title))
            .WithMessage($"Title must not exceed {PostTitle.MaxLength} characters.");

        RuleFor(x => x.SocialAccountIds)
            .NotNull()
            .WithMessage("Social account IDs are required.")
            .Must(ids => ids != null && ids.Count > 0)
            .When(x => x != null && (x.PublishNow || x.ScheduledAtUtc.HasValue))
            .WithMessage("At least one social account is required for scheduled or immediate publishing.");

        RuleFor(x => x)
            .MustAsync(BeFutureOrUnchangedScheduledTimeAsync)
            .When(x => x != null && x.ScheduledAtUtc.HasValue && !x.PublishNow && x.IsDraft != true)
            .WithMessage("Scheduled time must be in the future.");
    }

    private async Task<bool> BeFutureOrUnchangedScheduledTimeAsync(UpdateZernioPostCommand command, CancellationToken cancellationToken)
    {
        if (command == null || !command.ScheduledAtUtc.HasValue) return true;
        if (command.ScheduledAtUtc.Value > DateTime.UtcNow) return true;

        var post = await _postRepository.GetByZernioPostIdAsync(command.PostId);
        if (post == null) return false;

        DateTime? existingScheduledTime = post.ScheduledAt.IsNone ? null : post.ScheduledAt.UtcValue;
        return existingScheduledTime == command.ScheduledAtUtc.Value;
    }
}
