using MediatR;
using System;

namespace Syncra.Application.Features.Subscriptions.Commands;

public record StartTrialCommand(Guid WorkspaceId, Guid UserId, string PlanCode) : IRequest;
