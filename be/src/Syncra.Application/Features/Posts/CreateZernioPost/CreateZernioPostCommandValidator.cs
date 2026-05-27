using FluentValidation;
using Syncra.Domain.ValueObjects;

namespace Syncra.Application.Features.Posts.CreateZernioPost;

public sealed class CreateZernioPostCommandValidator : AbstractValidator<CreateZernioPostCommand>
{
    public CreateZernioPostCommandValidator()
    {
        RuleFor(x => x.WorkspaceId)
            .NotEmpty()
            .WithMessage("Workspace ID is required.");

        RuleFor(x => x.UserId)
            .NotEmpty()
            .WithMessage("User ID is required.");

        RuleFor(x => x.Title)
            .NotEmpty()
            .WithMessage("Title is required.")
            .MaximumLength(PostTitle.MaxLength)
            .WithMessage($"Title must not exceed {PostTitle.MaxLength} characters.");

        RuleFor(x => x.Content)
            .NotEmpty()
            .WithMessage("Content is required.");

        RuleFor(x => x.SocialAccountIds)
            .NotNull()
            .WithMessage("Social account IDs are required.")
            .Must(ids => ids.Count > 0)
            .WithMessage("At least one social account is required.");

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
