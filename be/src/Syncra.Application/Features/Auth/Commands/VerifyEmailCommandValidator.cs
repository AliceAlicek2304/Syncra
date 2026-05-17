using FluentValidation;

namespace Syncra.Application.Features.Auth.Commands;

public sealed class VerifyEmailCommandValidator : AbstractValidator<VerifyEmailCommand>
{
    public VerifyEmailCommandValidator()
    {
        RuleFor(x => x.Token)
            .NotEmpty().WithMessage("Verification token is required.")
            .MinimumLength(10).WithMessage("Token is invalid.");
    }
}
