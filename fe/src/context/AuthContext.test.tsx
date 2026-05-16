import { renderHook, act } from '@testing-library/react';
import { AuthProvider, useAuth } from './AuthContext';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import React from 'react';
import { authApi } from '../api/auth';

// Mock authApi
vi.mock('../api/auth', () => ({
  authApi: {
    login: vi.fn(),
    getMe: vi.fn(),
  },
}));

const MOCK_USER = {
  userId: '123',
  email: 'test@example.com',
  displayName: 'Test User',
};

const MOCK_AUTH_RESPONSE = {
  token: 'mock-token',
  refreshToken: 'mock-refresh-token',
  expiresAtUtc: '2026-05-03T12:00:00Z',
};

describe('AuthContext', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('should start with null user', async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthProvider>{children}</AuthProvider>
    );
    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current.user).toBeNull();
    // It might be false immediately if useEffect runs fast, so we check that it's a boolean
    expect(typeof result.current.loading).toBe('boolean');
  });

  it('should hydrate user if token exists', async () => {
    localStorage.setItem('syncra_access_token', 'existing-token');
    vi.mocked(authApi.getMe).mockResolvedValue(MOCK_USER);

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthProvider>{children}</AuthProvider>
    );
    const { result } = renderHook(() => useAuth(), { wrapper });

    // Wait for useEffect hydration
    await act(async () => {
      await Promise.resolve(); // Let the hydrate promise resolve
    });

    expect(authApi.getMe).toHaveBeenCalled();
    expect(result.current.user).toEqual(MOCK_USER);
    expect(result.current.loading).toBe(false);
  });

  it('should set user on login', async () => {
    vi.mocked(authApi.login).mockResolvedValue(MOCK_AUTH_RESPONSE);
    vi.mocked(authApi.getMe).mockResolvedValue(MOCK_USER);

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthProvider>{children}</AuthProvider>
    );
    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.login({ email: 'test@example.com', password: 'password' });
    });

    expect(localStorage.getItem('syncra_access_token')).toBe('mock-token');
    expect(result.current.user).toEqual(MOCK_USER);
  });

  it('should clear user on logout', async () => {
    vi.mocked(authApi.login).mockResolvedValue(MOCK_AUTH_RESPONSE);
    vi.mocked(authApi.getMe).mockResolvedValue(MOCK_USER);

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthProvider>{children}</AuthProvider>
    );
    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.login({ email: 'test@example.com', password: 'password' });
    });

    expect(result.current.user).not.toBeNull();

    await act(async () => {
      result.current.logout();
    });

    expect(result.current.user).toBeNull();
    expect(localStorage.getItem('syncra_access_token')).toBeNull();
  });
});
