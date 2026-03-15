using FluentValidation;
using Syncra.Application.Features.Workspaces.Commands;

namespace Syncra.Application.Features.Workspaces.Commands;

public sealed class CreateWorkspaceCommandValidator : AbstractValidator<CreateWorkspaceCommand>
{
    public CreateWorkspaceCommandValidator()
    {
        RuleFor(x => x.UserId)
            .NotEmpty().WithMessage("User ID is required.");

        RuleFor(x => x.Name)
            .NotEmpty().WithMessage("Workspace name is required.")
            .MinimumLength(1).WithMessage("Workspace name is required.")
            .MaximumLength(100).WithMessage("Workspace name must not exceed 100 characters.");
    }
}