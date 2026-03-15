using FluentValidation;
using Syncra.Application.Features.Integrations.Commands;

namespace Syncra.Application.Features.Integrations.Commands;

public sealed class DisconnectIntegrationCommandValidator : AbstractValidator<DisconnectIntegrationCommand>
{
    public DisconnectIntegrationCommandValidator()
    {
        RuleFor(x => x.WorkspaceId)
            .NotEmpty()
            .WithMessage("Workspace ID is required.");

        RuleFor(x => x.ProviderId)
            .NotEmpty()
            .WithMessage("Provider ID is required.");
    }
}