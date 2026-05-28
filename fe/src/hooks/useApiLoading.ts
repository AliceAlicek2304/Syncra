import { useState, useEffect } from 'react';
import { subscribeToRequests } from '../lib/axios';

/**
 * Hook to track whether any active Axios request is in progress,
 * optionally filtering by url string, RegExp, or dynamic function pattern.
 */
export function useApiLoading(pattern?: string | RegExp | ((url: string) => boolean)) {
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    return subscribeToRequests((_, activeUrls) => {
      if (!pattern) {
        setIsLoading(activeUrls.length > 0);
        return;
      }

      const match = activeUrls.some((url) => {
        if (typeof pattern === 'string') {
          return url.includes(pattern);
        }
        if (pattern instanceof RegExp) {
          return pattern.test(url);
        }
        if (typeof pattern === 'function') {
          return pattern(url);
        }
        return false;
      });

      setIsLoading(match);
    });
  }, [pattern]);

  return isLoading;
}
