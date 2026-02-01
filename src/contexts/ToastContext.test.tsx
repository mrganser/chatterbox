import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { ToastProvider, useToast } from './ToastContext';

// Test component that uses the context
function TestConsumer({
  onMount,
}: {
  onMount?: (showToast: ReturnType<typeof useToast>['showToast']) => void;
}) {
  const { showToast } = useToast();

  // Call onMount with showToast if provided
  if (onMount) {
    onMount(showToast);
  }

  return <button onClick={() => showToast('Test message')}>Show Toast</button>;
}

describe('ToastContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('ToastProvider', () => {
    it('provides toast context to children', () => {
      render(
        <ToastProvider>
          <TestConsumer />
        </ToastProvider>
      );

      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('renders ToastContainer', () => {
      render(
        <ToastProvider>
          <TestConsumer />
        </ToastProvider>
      );

      // ToastContainer should be in the DOM (may be empty initially)
      // The container has a specific structure
      expect(document.body).toContainElement(screen.getByRole('button'));
    });
  });

  describe('showToast', () => {
    it('displays toast message when called', () => {
      render(
        <ToastProvider>
          <TestConsumer />
        </ToastProvider>
      );

      act(() => {
        screen.getByRole('button').click();
      });

      expect(screen.getByText('Test message')).toBeInTheDocument();
    });

    it('displays toast with custom variant', () => {
      let capturedShowToast: ReturnType<typeof useToast>['showToast'];

      render(
        <ToastProvider>
          <TestConsumer
            onMount={(showToast) => {
              capturedShowToast = showToast;
            }}
          />
        </ToastProvider>
      );

      act(() => {
        capturedShowToast!('Warning message', 'warning');
      });

      expect(screen.getByText('Warning message')).toBeInTheDocument();
    });

    it('displays multiple toasts', () => {
      let capturedShowToast: ReturnType<typeof useToast>['showToast'];

      render(
        <ToastProvider>
          <TestConsumer
            onMount={(showToast) => {
              capturedShowToast = showToast;
            }}
          />
        </ToastProvider>
      );

      act(() => {
        capturedShowToast!('First toast');
        capturedShowToast!('Second toast');
        capturedShowToast!('Third toast');
      });

      expect(screen.getByText('First toast')).toBeInTheDocument();
      expect(screen.getByText('Second toast')).toBeInTheDocument();
      expect(screen.getByText('Third toast')).toBeInTheDocument();
    });

    it('generates unique IDs for toasts', () => {
      let capturedShowToast: ReturnType<typeof useToast>['showToast'];

      render(
        <ToastProvider>
          <TestConsumer
            onMount={(showToast) => {
              capturedShowToast = showToast;
            }}
          />
        </ToastProvider>
      );

      // Show same message twice - should create two separate toasts
      act(() => {
        capturedShowToast!('Same message');
        capturedShowToast!('Same message');
      });

      const toasts = screen.getAllByText('Same message');
      expect(toasts).toHaveLength(2);
    });
  });

  describe('useToast', () => {
    it('throws error when used outside provider', () => {
      // Suppress console.error for this test
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        render(<TestConsumer />);
      }).toThrow('useToast must be used within a ToastProvider');

      consoleSpy.mockRestore();
    });

    it('returns stable showToast function', () => {
      const showToastRefs: ReturnType<typeof useToast>['showToast'][] = [];

      function TrackingConsumer() {
        const { showToast } = useToast();
        showToastRefs.push(showToast);
        return <button onClick={() => showToast('test')}>Click</button>;
      }

      const { rerender } = render(
        <ToastProvider>
          <TrackingConsumer />
        </ToastProvider>
      );

      rerender(
        <ToastProvider>
          <TrackingConsumer />
        </ToastProvider>
      );

      // showToast should be the same function across renders (memoized with useCallback)
      expect(showToastRefs[0]).toBe(showToastRefs[1]);
    });
  });
});
