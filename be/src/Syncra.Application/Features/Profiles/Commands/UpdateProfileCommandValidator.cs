using FluentValidation;
using Syncra.Domain.Entities;

namespace Syncra.Application.Features.Profiles.Commands;

public sealed class UpdateProfileCommandValidator : AbstractValidator<UpdateProfileCommand>
{
    public UpdateProfileCommandValidator()
    {
        RuleFor(x => x.ProfileId)
            .NotEmpty().WithMessage("Profile ID is required.");

        RuleFor(x => x.WorkspaceId)
            .NotEmpty().WithMessage("Workspace ID is required.");

        RuleFor(x => x.UserId)
            .NotEmpty().WithMessage("User ID is required.");

        RuleFor(x => x.Name)
            .NotEmpty().WithMessage("Profile name is required.")
            .MaximumLength(ZernioProfile.DisplayNameMaxLength)
                .WithMessage($"Profile name must not exceed {ZernioProfile.DisplayNameMaxLength} characters.");
    }
}
