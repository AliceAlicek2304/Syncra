import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { postsApi } from '../api/posts';
import type { Post } from '../api/posts';

interface UseCalendarPostsArgs {
  workspaceId?: string;
  year: number;
  month: number;
}

export interface CalendarPostItem extends Post {
  localDate: Date;
  localYear: number;
  localMonth: number;
  localDay: number;
  localTime: string;
}

const toIso = (d: Date) => d.toISOString();

const toCalendarItem = (post: Post): CalendarPostItem => {
  const localDate = post.scheduledAtUtc ? new Date(post.scheduledAtUtc) : new Date();

  return {
    ...post,
    localDate,
    localYear: localDate.getFullYear(),
    localMonth: localDate.getMonth(),
    localDay: localDate.getDate(),
    localTime: `${String(localDate.getHours()).padStart(2, '0')}:${String(localDate.getMinutes()).padStart(2, '0')}`,
  };
};

export function useCalendarPosts({ workspaceId, year, month }: UseCalendarPostsArgs) {
  const queryClient = useQueryClient();

  const range = useMemo(() => {
    const from = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));
    const to = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999));

    return {
      from,
      to,
      scheduledFromUtc: toIso(from),
      scheduledToUtc: toIso(to),
    };
  }, [year, month]);

  const queryKey = ['calendar-posts', workspaceId, year, month] as const;

  const query = useQuery({
    queryKey,
    enabled: Boolean(workspaceId),
    queryFn: async () => {
      if (!workspaceId) return [] as CalendarPostItem[];

      const posts = await postsApi.getPosts(workspaceId, {
        scheduledFromUtc: range.scheduledFromUtc,
        scheduledToUtc: range.scheduledToUtc,
        page: 1,
        pageSize: 200,
      });

      return posts
        .filter((post) => Boolean(post.scheduledAtUtc))
        .map(toCalendarItem);
    },
  });

  const rescheduleMutation = useMutation({
    mutationFn: async ({ postId, scheduledAtUtc }: { postId: string; scheduledAtUtc: string }) => {
      if (!workspaceId) throw new Error('Missing workspace id');
      const post = await postsApi.reschedulePost(workspaceId, postId, scheduledAtUtc);
      return toCalendarItem(post);
    },
    onMutate: async ({ postId, scheduledAtUtc }) => {
      await queryClient.cancelQueries({ queryKey });

      const previous = queryClient.getQueryData<CalendarPostItem[]>(queryKey) ?? [];

      queryClient.setQueryData<CalendarPostItem[]>(
        queryKey,
        previous.map((post) => {
          if (post.id !== postId) return post;

          return toCalendarItem({ ...post, scheduledAtUtc });
        })
      );

      return { previous };
    },
    onError: (_error, _vars, ctx) => {
      if (ctx?.previous) {
        queryClient.setQueryData(queryKey, ctx.previous);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey });
    },
  });

  const removeMutation = useMutation({
    mutationFn: async (postId: string) => {
      if (!workspaceId) throw new Error('Missing workspace id');
      const post = query.data?.find((p) => p.id === postId);
      if (post && post.zernioPostId) {
        await postsApi.deleteZernioPost(workspaceId, post.zernioPostId);
      } else {
        await postsApi.deletePost(workspaceId, postId);
      }
      return postId;
    },
    onMutate: async (postId) => {
      await queryClient.cancelQueries({ queryKey });

      const previous = queryClient.getQueryData<CalendarPostItem[]>(queryKey) ?? [];
      queryClient.setQueryData<CalendarPostItem[]>(
        queryKey,
        previous.filter((post) => post.id !== postId)
      );

      return { previous };
    },
    onError: (_error, _postId, ctx) => {
      if (ctx?.previous) {
        queryClient.setQueryData(queryKey, ctx.previous);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey });
    },
  });

  return {
    posts: query.data ?? [],
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isMutating: rescheduleMutation.isPending || removeMutation.isPending,
    range,
    reschedule: rescheduleMutation.mutateAsync,
    remove: removeMutation.mutateAsync,
  };
}
