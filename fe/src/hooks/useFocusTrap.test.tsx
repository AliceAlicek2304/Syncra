import { render, renderHook, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect } from 'vitest';
import { useFocusTrap } from './useFocusTrap';

function TestComponent({ active = true }: { active?: boolean }) {
  const { ref } = useFocusTrap(active);
  return (
    <div ref={ref} data-testid="trap-container">
      <button data-testid="btn-1">First</button>
      <button data-testid="btn-2">Second</button>
      <button data-testid="btn-3">Third</button>
      <button tabIndex={-1} data-testid="btn-hidden">Hidden</button>
      <input data-testid="input-1" type="text" />
      <a href="#" data-testid="link-1">Link</a>
    </div>
  );
}

describe('useFocusTrap', () => {
  it('should cycle Tab forward through focusable elements', async () => {
    render(<TestComponent />);
    const user = userEvent.setup();

    const first = screen.getByTestId('btn-1');
    first.focus();

    await user.tab();
    expect(screen.getByTestId('btn-2')).toHaveFocus();

    await user.tab();
    expect(screen.getByTestId('btn-3')).toHaveFocus();

    await user.tab();
    expect(screen.getByTestId('input-1')).toHaveFocus();

    await user.tab();
    expect(screen.getByTestId('link-1')).toHaveFocus();

    await user.tab();
    expect(screen.getByTestId('btn-1')).toHaveFocus();
  });

  it('should cycle Shift+Tab backward through focusable elements', async () => {
    render(<TestComponent />);
    const user = userEvent.setup();

    const first = screen.getByTestId('btn-1');
    first.focus();

    await user.tab({ shift: true });
    expect(screen.getByTestId('link-1')).toHaveFocus();

    await user.tab({ shift: true });
    expect(screen.getByTestId('input-1')).toHaveFocus();
  });

  it('should skip elements with tabIndex={-1}', () => {
    render(<TestComponent />);
    const hidden = screen.getByTestId('btn-hidden');
    expect(hidden.tabIndex).toBe(-1);
  });

  it('should not trap focus when active is false', async () => {
    render(<TestComponent active={false} />);
    const user = userEvent.setup();

    const first = screen.getByTestId('btn-1');
    first.focus();

    for (let i = 0; i < 10; i++) {
      await user.tab();
    }

    expect(screen.getByTestId('btn-1')).not.toHaveFocus();
  });

  it('should return ref, focusFirst, and focusLast from hook', () => {
    const { result } = renderHook(() => useFocusTrap(true));
    expect(result.current.ref).toBeDefined();
    expect(typeof result.current.focusFirst).toBe('function');
    expect(typeof result.current.focusLast).toBe('function');
  });
});
