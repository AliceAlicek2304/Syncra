using MediatR;
using Syncra.Application.DTOs.Students;

namespace Syncra.Application.Features.Students.Queries;

public sealed record GetStudentVerificationStatusQuery(Guid UserId) : IRequest<StudentVerificationStatusDto>;
