using FluentValidation;
using Syncra.Application.Features.Posts.Commands;

namespace Syncra.Application.Features.Posts.Commands;

public sealed class PublishPostCommandValidator : AbstractValidator<PublishPostCommand>
{
    public PublishPostCommandValidator()
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
    }
}