import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { ShareDialog } from './ShareDialog';

describe('ShareDialog', () => {
  const mockOnOpenChange = vi.fn();
  const testRoomUrl = 'https://example.com/room/test-room-123';

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('rendering', () => {
    it('renders dialog when open', () => {
      render(<ShareDialog open={true} onOpenChange={mockOnOpenChange} roomUrl={testRoomUrl} />);

      expect(screen.getByText('Share this room')).toBeInTheDocument();
    });

    it('does not render dialog when closed', () => {
      render(<ShareDialog open={false} onOpenChange={mockOnOpenChange} roomUrl={testRoomUrl} />);

      expect(screen.queryByText('Share this room')).not.toBeInTheDocument();
    });

    it('displays the room URL in input', () => {
      render(<ShareDialog open={true} onOpenChange={mockOnOpenChange} roomUrl={testRoomUrl} />);

      const input = screen.getByDisplayValue(testRoomUrl);
      expect(input).toBeInTheDocument();
      expect(input).toHaveAttribute('readonly');
    });

    it('displays description text', () => {
      render(<ShareDialog open={true} onOpenChange={mockOnOpenChange} roomUrl={testRoomUrl} />);

      expect(screen.getByText(/Copy the link below and share it with others/)).toBeInTheDocument();
    });

    it('displays footer notice', () => {
      render(<ShareDialog open={true} onOpenChange={mockOnOpenChange} roomUrl={testRoomUrl} />);

      expect(screen.getByText('Anyone with this link can join the room')).toBeInTheDocument();
    });
  });

  describe('copy functionality', () => {
    it('shows Copy button initially', () => {
      render(<ShareDialog open={true} onOpenChange={mockOnOpenChange} roomUrl={testRoomUrl} />);

      expect(screen.getByText('Copy')).toBeInTheDocument();
    });

    it('copies URL to clipboard when button clicked', async () => {
      render(<ShareDialog open={true} onOpenChange={mockOnOpenChange} roomUrl={testRoomUrl} />);

      await act(async () => {
        fireEvent.click(screen.getByText('Copy'));
      });

      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(testRoomUrl);
    });

    it('shows Copied state after copying', async () => {
      render(<ShareDialog open={true} onOpenChange={mockOnOpenChange} roomUrl={testRoomUrl} />);

      await act(async () => {
        fireEvent.click(screen.getByText('Copy'));
      });

      expect(screen.getByText('Copied')).toBeInTheDocument();
      expect(screen.queryByText('Copy')).not.toBeInTheDocument();
    });

    it('reverts to Copy state after 2 seconds', async () => {
      render(<ShareDialog open={true} onOpenChange={mockOnOpenChange} roomUrl={testRoomUrl} />);

      await act(async () => {
        fireEvent.click(screen.getByText('Copy'));
      });

      expect(screen.getByText('Copied')).toBeInTheDocument();

      // Fast-forward 2 seconds
      await act(async () => {
        vi.advanceTimersByTime(2000);
      });

      expect(screen.getByText('Copy')).toBeInTheDocument();
      expect(screen.queryByText('Copied')).not.toBeInTheDocument();
    });

    it('does not revert before 2 seconds', async () => {
      render(<ShareDialog open={true} onOpenChange={mockOnOpenChange} roomUrl={testRoomUrl} />);

      await act(async () => {
        fireEvent.click(screen.getByText('Copy'));
      });

      // Fast-forward 1.9 seconds (just before reset)
      await act(async () => {
        vi.advanceTimersByTime(1900);
      });

      expect(screen.getByText('Copied')).toBeInTheDocument();
    });
  });

  describe('dialog close', () => {
    it('calls onOpenChange when close button clicked', () => {
      render(<ShareDialog open={true} onOpenChange={mockOnOpenChange} roomUrl={testRoomUrl} />);

      // The close button is the first button (before Copy)
      const buttons = screen.getAllByRole('button');
      const closeButton = buttons[0]; // First button is the X close button
      fireEvent.click(closeButton);

      expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    });
  });
});
