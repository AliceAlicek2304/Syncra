using MediatR;
using Syncra.Application.DTOs.Students;

namespace Syncra.Application.Features.Students.Commands;

public sealed record VerifyStudentEmailCommand(
    Guid UserId,
    string StudentEmail,
    string Code) : IRequest<VerifyStudentEmailResponse>;
