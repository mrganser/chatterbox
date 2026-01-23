import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PreCallActions } from './PreCallActions';

describe('PreCallActions', () => {
  const mockOnJoin = vi.fn();

  const defaultProps = {
    roomId: 'test-room-123',
    isConnecting: false,
    onJoin: mockOnJoin,
  };

  beforeEach(() => {
    mockOnJoin.mockClear();
  });

  describe('rendering', () => {
    it('renders the ready to join heading', () => {
      render(<PreCallActions {...defaultProps} />);

      expect(screen.getByText('Ready to join?')).toBeInTheDocument();
    });

    it('displays the room ID', () => {
      render(<PreCallActions {...defaultProps} roomId="my-custom-room" />);

      expect(screen.getByText('my-custom-room')).toBeInTheDocument();
    });

    it('shows camera and microphone requirement notice', () => {
      render(<PreCallActions {...defaultProps} />);

      expect(screen.getByText('Camera and microphone access required')).toBeInTheDocument();
    });

    it('shows encryption notice', () => {
      render(<PreCallActions {...defaultProps} />);

      expect(screen.getByText('End-to-end encrypted connection')).toBeInTheDocument();
    });

    it('shows consent notice', () => {
      render(<PreCallActions {...defaultProps} />);

      expect(
        screen.getByText('By joining, you agree to share your camera and microphone')
      ).toBeInTheDocument();
    });

    it('renders join room button when not connecting', () => {
      render(<PreCallActions {...defaultProps} isConnecting={false} />);

      expect(screen.getByRole('button', { name: /join room/i })).toBeInTheDocument();
    });

    it('renders connecting state when isConnecting is true', () => {
      render(<PreCallActions {...defaultProps} isConnecting={true} />);

      expect(screen.getByText('Connecting...')).toBeInTheDocument();
    });
  });

  describe('join room journey', () => {
    it('calls onJoin when Join Room button is clicked', async () => {
      const user = userEvent.setup();
      render(<PreCallActions {...defaultProps} />);

      const joinButton = screen.getByRole('button', { name: /join room/i });
      await user.click(joinButton);

      expect(mockOnJoin).toHaveBeenCalledTimes(1);
    });

    it('disables button while connecting', () => {
      render(<PreCallActions {...defaultProps} isConnecting={true} />);

      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
    });

    it('enables button when not connecting', () => {
      render(<PreCallActions {...defaultProps} isConnecting={false} />);

      const button = screen.getByRole('button', { name: /join room/i });
      expect(button).not.toBeDisabled();
    });

    it('does not call onJoin when button is disabled', async () => {
      const user = userEvent.setup();
      render(<PreCallActions {...defaultProps} isConnecting={true} />);

      const button = screen.getByRole('button');

      // Click should not work on disabled button
      await user.click(button);

      expect(mockOnJoin).not.toHaveBeenCalled();
    });
  });

  describe('different room IDs', () => {
    it('handles room ID with special characters', () => {
      render(<PreCallActions {...defaultProps} roomId="room-with-dashes-123" />);

      expect(screen.getByText('room-with-dashes-123')).toBeInTheDocument();
    });

    it('handles generated room ID format', () => {
      render(<PreCallActions {...defaultProps} roomId="cosmic-nexus-456" />);

      expect(screen.getByText('cosmic-nexus-456')).toBeInTheDocument();
    });

    it('handles short room ID', () => {
      render(<PreCallActions {...defaultProps} roomId="abc" />);

      expect(screen.getByText('abc')).toBeInTheDocument();
    });
  });
});
