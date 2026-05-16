using Syncra.Domain.Entities;

namespace Syncra.Application.Interfaces;

public interface INotificationDispatcher
{
    Task DispatchAsync(Notification notification, CancellationToken cancellationToken = default);
}
