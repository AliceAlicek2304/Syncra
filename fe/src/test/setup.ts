import React from 'react';
import '@testing-library/jest-dom';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// Runs a cleanup after each test case (e.g. clearing jsdom)
afterEach(() => {
  cleanup();
});

// Framer Motion mock — jsdom lacks browser animation APIs that framer-motion requires.
// This mock renders motion.* as plain HTML elements so component tests run correctly.
vi.mock('framer-motion', async (importOriginal) => {
  const actual = await importOriginal<typeof import('framer-motion')>();
  return {
    ...actual,
    useReducedMotion: vi.fn(() => false),
    AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
    motion: new Proxy(
      {},
      {
        get: (_target, tag: string) =>
          ({ children, ...props }: { children: React.ReactNode; [key: string]: unknown }) => {
            const { ...rest } = props;
            return React.createElement(tag, rest, children);
          },
      }
    ),
  };
});
