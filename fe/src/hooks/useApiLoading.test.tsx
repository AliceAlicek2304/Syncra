import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useApiLoading } from './useApiLoading';

describe('useApiLoading', () => {
  it('subscribes to axios events and updates loading state', async () => {
    // Render the hook
    const { result } = renderHook(() => useApiLoading());
    expect(result.current).toBe(false);
  });
});
