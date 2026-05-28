import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { Button } from './Button';

describe('Button', () => {
  it('renders children correctly', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeDefined();
  });

  it('handles standard click handler', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    
    fireEvent.click(screen.getByText('Click me'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('automatically sets loading state for promise-returning onClick', async () => {
    let resolvePromise!: (value: unknown) => void;
    const promise = new Promise((resolve) => {
      resolvePromise = resolve;
    });
    
    const handleClick = vi.fn().mockReturnValue(promise);
    
    render(<Button onClick={handleClick}>Submit</Button>);
    
    const button = screen.getByRole('button');
    expect(button.getAttribute('disabled')).toBeNull();

    // Trigger click
    fireEvent.click(button);
    expect(handleClick).toHaveBeenCalledTimes(1);

    // Should immediately enter loading state
    expect(button.getAttribute('disabled')).toBeDefined();
    expect(button.getAttribute('aria-disabled')).toBe('true');

    // Resolve the promise
    await act(async () => {
      resolvePromise(null);
      await promise;
    });

    // Should revert back to non-loading
    expect(button.getAttribute('disabled')).toBeNull();
  });

  it('respects explicitly passed isLoading prop', () => {
    render(<Button isLoading={true}>Submit</Button>);
    const button = screen.getByRole('button');
    
    expect(button.getAttribute('disabled')).toBeDefined();
    expect(button.getAttribute('aria-disabled')).toBe('true');
  });

  it('disables click handler when isLoading is true', () => {
    const handleClick = vi.fn();
    render(<Button isLoading={true} onClick={handleClick}>Submit</Button>);
    
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).not.toHaveBeenCalled();
  });
});
