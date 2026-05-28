import { useMutation } from '@tanstack/react-query';
import type { UseMutationOptions, UseMutationResult } from '@tanstack/react-query';

/**
 * Custom hook wrapping React Query's useMutation.
 * Can be extended with toast notifications, automatic query invalidations,
 * or custom event tracking.
 */
export function useApiMutation<
  TData = unknown,
  TError = unknown,
  TVariables = void,
  TContext = unknown
>(
  options: UseMutationOptions<TData, TError, TVariables, TContext>
): UseMutationResult<TData, TError, TVariables, TContext> & {
  mutatePromise: (variables: TVariables) => Promise<TData>;
} {
  const mutation = useMutation(options);

  // Provide a direct helper that executes mutateAsync to work seamlessly
  // with Button's promise-based automatic loading handler.
  const mutatePromise = (variables: TVariables) => {
    return mutation.mutateAsync(variables);
  };

  return {
    ...mutation,
    mutatePromise,
  };
}
