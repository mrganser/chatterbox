import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PreCallActions } from './PreCallActions';

describe('PreCallActions', () => {
  const mockOnJoin = vi.fn();
  const mockOnNameChange = vi.fn();
  const mockOnToggleStartWithVideo = vi.fn();
  const mockOnToggleStartWithAudio = vi.fn();

  const defaultProps = {
    roomId: 'test-room-123',
    isConnecting: false,
    name: '',
    onNameChange: mockOnNameChange,
    startWithVideo: true,
    startWithAudio: true,
    onToggleStartWithVideo: mockOnToggleStartWithVideo,
    onToggleStartWithAudio: mockOnToggleStartWithAudio,
    onJoin: mockOnJoin,
  };

  beforeEach(() => {
    mockOnJoin.mockClear();
    mockOnNameChange.mockClear();
    mockOnToggleStartWithVideo.mockClear();
    mockOnToggleStartWithAudio.mockClear();
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

    it('shows encryption notice', () => {
      render(<PreCallActions {...defaultProps} />);

      expect(screen.getByText('End-to-end encrypted connection')).toBeInTheDocument();
    });

    it('shows media toggle hint', () => {
      render(<PreCallActions {...defaultProps} />);

      expect(
        screen.getByText('You can toggle camera and mic on or off after joining')
      ).toBeInTheDocument();
    });

    it('shows camera and mic toggle buttons', () => {
      render(<PreCallActions {...defaultProps} />);

      expect(screen.getByTitle('Camera will be on')).toBeInTheDocument();
      expect(screen.getByTitle('Microphone will be on')).toBeInTheDocument();
    });

    it('shows disabled state for camera and mic toggles', () => {
      render(<PreCallActions {...defaultProps} startWithVideo={false} startWithAudio={false} />);

      expect(screen.getByTitle('Camera will be off')).toBeInTheDocument();
      expect(screen.getByTitle('Microphone will be muted')).toBeInTheDocument();
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

    it('disables join button while connecting', () => {
      render(<PreCallActions {...defaultProps} isConnecting={true} />);

      const button = screen.getByRole('button', { name: /connecting/i });
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

      const button = screen.getByRole('button', { name: /connecting/i });

      // Click should not work on disabled button
      await user.click(button);

      expect(mockOnJoin).not.toHaveBeenCalled();
    });
  });

  describe('media toggles', () => {
    it('calls onToggleStartWithVideo when camera toggle is clicked', async () => {
      const user = userEvent.setup();
      render(<PreCallActions {...defaultProps} />);

      const cameraToggle = screen.getByTitle('Camera will be on');
      await user.click(cameraToggle);

      expect(mockOnToggleStartWithVideo).toHaveBeenCalledTimes(1);
    });

    it('calls onToggleStartWithAudio when mic toggle is clicked', async () => {
      const user = userEvent.setup();
      render(<PreCallActions {...defaultProps} />);

      const micToggle = screen.getByTitle('Microphone will be on');
      await user.click(micToggle);

      expect(mockOnToggleStartWithAudio).toHaveBeenCalledTimes(1);
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
