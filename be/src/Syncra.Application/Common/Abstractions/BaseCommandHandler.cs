using MediatR;

namespace Syncra.Application.Common.Abstractions;

/// <summary>
/// Base class for command handlers that return a result.
/// Provides a consistent pattern and a single place to add cross-cutting concerns.
/// </summary>
public abstract class BaseCommandHandler<TCommand, TResult> : IRequestHandler<TCommand, TResult>
    where TCommand : IRequest<TResult>
{
    public abstract Task<TResult> Handle(TCommand request, CancellationToken cancellationToken);
}

/// <summary>
/// Base class for command handlers that return no result.
/// </summary>
public abstract class BaseCommandHandler<TCommand> : IRequestHandler<TCommand>
    where TCommand : IRequest
{
    public abstract Task Handle(TCommand request, CancellationToken cancellationToken);
}
