using FluentValidation;
using Syncra.Application.Interfaces;
using Syncra.Domain.Interfaces;
using System;
using System.Threading;
using System.Threading.Tasks;

namespace Syncra.Application.Features.Posts.Commands;

public sealed class UpdatePostCommandValidator : AbstractValidator<UpdatePostCommand>
{
    private readonly IPostRepository _postRepository;

    public UpdatePostCommandValidator(IPostRepository postRepository)
    {
        _postRepository = postRepository;

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

        RuleFor(x => x.Status)
            .Must(BeValidStatusOrNull)
            .When(x => x.Status != null)
            .WithMessage("Invalid status value.");

        RuleFor(x => x)
            .MustAsync(BeFutureOrUnchangedScheduledTimeAsync)
            .When(x => x != null && x.ScheduledAtUtc.HasValue)
            .WithMessage("Scheduled time must be in the future.");

        RuleFor(x => x.MediaIds)
            .Must(BeNullOrHaveValidIds)
            .When(x => x.MediaIds != null)
            .WithMessage("Invalid media IDs.");
    }

    private async Task<bool> BeFutureOrUnchangedScheduledTimeAsync(UpdatePostCommand command, CancellationToken cancellationToken)
    {
        if (command == null || !command.ScheduledAtUtc.HasValue) return true;
        if (command.ScheduledAtUtc.Value > DateTime.UtcNow) return true;

        var post = await _postRepository.GetByIdAsync(command.PostId);
        if (post == null) return false;

        DateTime? existingScheduledTime = post.ScheduledAt.IsNone ? null : post.ScheduledAt.UtcValue;
        return existingScheduledTime == command.ScheduledAtUtc.Value;
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