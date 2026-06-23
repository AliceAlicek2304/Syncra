using MediatR;
using Syncra.Application.DTOs.Students;

namespace Syncra.Application.Features.Students.Commands;

public sealed record RequestStudentVerificationCommand(
    Guid UserId,
    string StudentEmail) : IRequest<RequestStudentVerificationResponse>;
