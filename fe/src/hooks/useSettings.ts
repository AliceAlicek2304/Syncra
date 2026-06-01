import { useMutation, useQueryClient } from '@tanstack/react-query';
import { usersApi } from '../api/users';
import { workspacesApi } from '../api/workspaces';
import type { User } from '../api/types';

export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<User>) => usersApi.updateProfile(data),
    onSuccess: (updatedUser) => {
      queryClient.setQueryData(['user'], updatedUser);
      // Also update AuthContext if needed, but usually we just invalidate
      queryClient.invalidateQueries({ queryKey: ['user'] });
    },
  });
}

export function useUpdateWorkspace() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name: string; color?: string; description?: string } }) =>
      workspacesApi.updateWorkspace(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
    },
  });
}
