using FluentValidation;
using Syncra.Application.Features.Posts.Commands;

namespace Syncra.Application.Features.Posts.Commands;

public sealed class UpdatePostCommandValidator : AbstractValidator<UpdatePostCommand>
{
    public UpdatePostCommandValidator()
    {
        RuleFor(x => x.WorkspaceId)
            .NotEmpty()
            .WithMessage("Workspace ID is required.");

        RuleFor(x => x.PostId)
            .NotEmpty()
            .WithMessage("Post ID is required.");

        RuleFor(x => x.UserId)
            .NotEmpty()
            .WithMessage("User ID is required.");

        RuleFor(x => x.Title)
            .NotEmpty()
            .WithMessage("Title is required.")
            .MaximumLength(200)
            .WithMessage("Title must not exceed 200 characters.");

        RuleFor(x => x.Content)
            .NotEmpty()
            .WithMessage("Content is required.");

        RuleFor(x => x.ScheduledAtUtc)
            .Must(BeFutureWhenSpecified)
            .When(x => x.ScheduledAtUtc.HasValue)
            .WithMessage("Scheduled time must be in the future.");

        RuleFor(x => x.Status)
            .Must(BeValidStatusOrNull)
            .When(x => x.Status != null)
            .WithMessage("Invalid status value.");

        RuleFor(x => x.MediaIds)
            .Must(BeNullOrHaveValidIds)
            .When(x => x.MediaIds != null)
            .WithMessage("Invalid media IDs.");
    }

    private static bool BeFutureWhenSpecified(DateTime? scheduledAtUtc)
    {
        return !scheduledAtUtc.HasValue || scheduledAtUtc.Value > DateTime.UtcNow;
    }

    private static bool BeValidStatusOrNull(string? status)
    {
        if (string.IsNullOrWhiteSpace(status)) return true;
        return Enum.TryParse<Domain.Enums.PostStatus>(status, ignoreCase: true, out _);
    }

    private static bool BeNullOrHaveValidIds(IReadOnlyCollection<Guid>? mediaIds)
    {
        return mediaIds == null || mediaIds.Count == 0 || mediaIds.All(id => id != Guid.Empty);
    }
}