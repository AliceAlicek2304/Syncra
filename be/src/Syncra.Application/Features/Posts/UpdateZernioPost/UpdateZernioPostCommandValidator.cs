using FluentValidation;
using Syncra.Domain.ValueObjects;

namespace Syncra.Application.Features.Posts.UpdateZernioPost;

public sealed class UpdateZernioPostCommandValidator : AbstractValidator<UpdateZernioPostCommand>
{
    public UpdateZernioPostCommandValidator()
    {
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
            .Must(ids => ids.Count > 0)
            .When(x => x.PublishNow || x.ScheduledAtUtc.HasValue)
            .WithMessage("At least one social account is required for scheduled or immediate publishing.");

        RuleFor(x => x.ScheduledAtUtc)
            .Must(BeFutureWhenSpecified)
            .When(x => x.ScheduledAtUtc.HasValue)
            .WithMessage("Scheduled time must be in the future.");
    }

    private static bool BeFutureWhenSpecified(DateTime? scheduledAtUtc)
    {
        return !scheduledAtUtc.HasValue || scheduledAtUtc.Value > DateTime.UtcNow;
    }
}
