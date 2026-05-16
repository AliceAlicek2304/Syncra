using Syncra.Domain.Entities;

namespace Syncra.Domain.Interfaces;

public interface INotificationRepository
{
    Task AddAsync(Notification notification, CancellationToken cancellationToken = default);
}
