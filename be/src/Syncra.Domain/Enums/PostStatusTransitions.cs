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
            (PostStatus.Publishing, PostStatus.Partial) => true,
            (PostStatus.Partial, PostStatus.Draft) => true,
            (PostStatus.Partial, PostStatus.Publishing) => true,
            (PostStatus.Partial, PostStatus.Published) => true,
            (PostStatus.Partial, PostStatus.Failed) => true,
            (PostStatus.Failed, PostStatus.Publishing) => true,
            _ => false
        };

    public static PostStatus ApplyTransition(PostStatus current, PostStatus requested) =>
        CanTransition(current, requested) ? requested : current;

    public static bool IsTerminal(PostStatus status) =>
        status is PostStatus.Published or PostStatus.Failed;
}

