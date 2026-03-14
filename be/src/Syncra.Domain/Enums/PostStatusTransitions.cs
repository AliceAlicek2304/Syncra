namespace Syncra.Domain.Enums;

public static class PostStatusTransitions
{
    public static bool CanTransition(PostStatus current, PostStatus requested) =>
        current == requested || (current, requested) switch
        {
            (PostStatus.Draft, PostStatus.Scheduled) => true,
            (PostStatus.Draft, PostStatus.Publishing) => true,
            (PostStatus.Scheduled, PostStatus.Publishing) => true,
            (PostStatus.Publishing, PostStatus.Published) => true,
            (PostStatus.Publishing, PostStatus.Failed) => true,
            _ => false
        };

    public static PostStatus ApplyTransition(PostStatus current, PostStatus requested) =>
        CanTransition(current, requested) ? requested : current;

    public static bool IsTerminal(PostStatus status) =>
        status is PostStatus.Published or PostStatus.Failed;
}

