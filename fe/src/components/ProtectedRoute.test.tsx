import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { vi, describe, it, expect } from 'vitest';
import ProtectedRoute from './ProtectedRoute';
import { useAuth } from '../context/AuthContext';

vi.mock('../context/AuthContext', () => ({
  useAuth: vi.fn(),
}));

describe('ProtectedRoute', () => {
  it('should render children when authenticated', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { userId: '123', email: 'test@example.com' },
      loading: false,
      login: vi.fn(),
      logout: vi.fn(),
    } as unknown as ReturnType<typeof useAuth>);

    render(
      <MemoryRouter initialEntries={['/protected']}>
        <Routes>
          <Route
            path="/protected"
            element={
              <ProtectedRoute>
                <div data-testid="child">Child</div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByTestId('child')).toBeDefined();
  });

  it('should redirect to login when not authenticated', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      loading: false,
      login: vi.fn(),
      logout: vi.fn(),
    } as unknown as ReturnType<typeof useAuth>);

    render(
      <MemoryRouter initialEntries={['/protected']}>
        <Routes>
          <Route
            path="/protected"
            element={
              <ProtectedRoute>
                <div data-testid="child">Child</div>
              </ProtectedRoute>
            }
          />
          <Route path="/login" element={<div data-testid="login">Login Page</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.queryByTestId('child')).toBeNull();
    expect(screen.getByTestId('login')).toBeDefined();
  });

  it('should show nothing while loading', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      loading: true,
      login: vi.fn(),
      logout: vi.fn(),
    } as unknown as ReturnType<typeof useAuth>);

    render(
      <MemoryRouter initialEntries={['/protected']}>
        <ProtectedRoute>
          <div data-testid="child">Child</div>
        </ProtectedRoute>
      </MemoryRouter>
    );

    expect(screen.queryByTestId('child')).toBeNull();
  });
});
