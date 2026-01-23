import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Toolbar } from './Toolbar';

describe('Toolbar', () => {
  const mockOnToggleVideo = vi.fn();
  const mockOnToggleAudio = vi.fn();
  const mockOnToggleScreenShare = vi.fn();
  const mockOnToggleChat = vi.fn();
  const mockOnShare = vi.fn();
  const mockOnLeave = vi.fn();
  const mockOnFullscreen = vi.fn();

  const defaultProps = {
    videoEnabled: true,
    audioEnabled: true,
    isScreenSharing: false,
    chatUnreadCount: 0,
    onToggleVideo: mockOnToggleVideo,
    onToggleAudio: mockOnToggleAudio,
    onToggleScreenShare: mockOnToggleScreenShare,
    onToggleChat: mockOnToggleChat,
    onShare: mockOnShare,
    onLeave: mockOnLeave,
    onFullscreen: mockOnFullscreen,
  };

  beforeEach(() => {
    mockOnToggleVideo.mockClear();
    mockOnToggleAudio.mockClear();
    mockOnToggleScreenShare.mockClear();
    mockOnToggleChat.mockClear();
    mockOnShare.mockClear();
    mockOnLeave.mockClear();
    mockOnFullscreen.mockClear();
  });

  describe('rendering', () => {
    it('renders all control buttons', () => {
      render(<Toolbar {...defaultProps} />);

      // Get all buttons
      const buttons = screen.getAllByRole('button');

      // Should have 7 buttons: audio, video, screen share, chat, share, fullscreen, leave
      expect(buttons.length).toBe(7);
    });
  });

  describe('audio controls journey', () => {
    it('shows mute button when audio is enabled', () => {
      render(<Toolbar {...defaultProps} audioEnabled={true} />);

      // The Mic icon should be present (not MicOff)
      const buttons = screen.getAllByRole('button');
      const audioButton = buttons[0]; // First button is audio

      // Check that it has the Mic class (not MicOff)
      expect(audioButton.querySelector('svg.lucide-mic')).toBeInTheDocument();
    });

    it('shows unmute button when audio is disabled', () => {
      render(<Toolbar {...defaultProps} audioEnabled={false} />);

      const buttons = screen.getAllByRole('button');
      const audioButton = buttons[0];

      expect(audioButton.querySelector('svg.lucide-mic-off')).toBeInTheDocument();
    });

    it('calls onToggleAudio when audio button clicked', async () => {
      const user = userEvent.setup();
      render(<Toolbar {...defaultProps} />);

      const buttons = screen.getAllByRole('button');
      await user.click(buttons[0]); // Audio button

      expect(mockOnToggleAudio).toHaveBeenCalledTimes(1);
    });

    it('applies destructive style when audio is disabled', () => {
      render(<Toolbar {...defaultProps} audioEnabled={false} />);

      const buttons = screen.getAllByRole('button');
      const audioButton = buttons[0];

      // Should have destructive variant styling
      expect(audioButton.className).toContain('destructive');
    });
  });

  describe('video controls journey', () => {
    it('shows camera on icon when video is enabled', () => {
      render(<Toolbar {...defaultProps} videoEnabled={true} />);

      const buttons = screen.getAllByRole('button');
      const videoButton = buttons[1]; // Second button is video

      expect(videoButton.querySelector('svg.lucide-video')).toBeInTheDocument();
    });

    it('shows camera off icon when video is disabled', () => {
      render(<Toolbar {...defaultProps} videoEnabled={false} />);

      const buttons = screen.getAllByRole('button');
      const videoButton = buttons[1];

      expect(videoButton.querySelector('svg.lucide-video-off')).toBeInTheDocument();
    });

    it('calls onToggleVideo when video button clicked', async () => {
      const user = userEvent.setup();
      render(<Toolbar {...defaultProps} />);

      const buttons = screen.getAllByRole('button');
      await user.click(buttons[1]); // Video button

      expect(mockOnToggleVideo).toHaveBeenCalledTimes(1);
    });

    it('applies destructive style when video is disabled', () => {
      render(<Toolbar {...defaultProps} videoEnabled={false} />);

      const buttons = screen.getAllByRole('button');
      const videoButton = buttons[1];

      expect(videoButton.className).toContain('destructive');
    });
  });

  describe('screen share controls journey', () => {
    it('shows monitor icon when not sharing', () => {
      render(<Toolbar {...defaultProps} isScreenSharing={false} />);

      const buttons = screen.getAllByRole('button');
      const screenButton = buttons[2]; // Third button (after divider) is screen share

      expect(screenButton.querySelector('svg.lucide-monitor')).toBeInTheDocument();
    });

    it('shows monitor-off icon when sharing', () => {
      render(<Toolbar {...defaultProps} isScreenSharing={true} />);

      const buttons = screen.getAllByRole('button');
      const screenButton = buttons[2];

      expect(screenButton.querySelector('svg.lucide-monitor-off')).toBeInTheDocument();
    });

    it('calls onToggleScreenShare when screen share button clicked', async () => {
      const user = userEvent.setup();
      render(<Toolbar {...defaultProps} />);

      const buttons = screen.getAllByRole('button');
      await user.click(buttons[2]); // Screen share button

      expect(mockOnToggleScreenShare).toHaveBeenCalledTimes(1);
    });
  });

  describe('chat controls journey', () => {
    it('calls onToggleChat when chat button clicked', async () => {
      const user = userEvent.setup();
      render(<Toolbar {...defaultProps} />);

      const buttons = screen.getAllByRole('button');
      await user.click(buttons[3]); // Chat button

      expect(mockOnToggleChat).toHaveBeenCalledTimes(1);
    });

    it('shows unread count badge when there are unread messages', () => {
      render(<Toolbar {...defaultProps} chatUnreadCount={5} />);

      expect(screen.getByText('5')).toBeInTheDocument();
    });

    it('shows 9+ when unread count exceeds 9', () => {
      render(<Toolbar {...defaultProps} chatUnreadCount={15} />);

      expect(screen.getByText('9+')).toBeInTheDocument();
    });

    it('does not show badge when no unread messages', () => {
      render(<Toolbar {...defaultProps} chatUnreadCount={0} />);

      expect(screen.queryByText('0')).not.toBeInTheDocument();
    });
  });

  describe('share link', () => {
    it('calls onShare when share button clicked', async () => {
      const user = userEvent.setup();
      render(<Toolbar {...defaultProps} />);

      const buttons = screen.getAllByRole('button');
      await user.click(buttons[4]); // Share button

      expect(mockOnShare).toHaveBeenCalledTimes(1);
    });
  });

  describe('fullscreen', () => {
    it('calls onFullscreen when fullscreen button clicked', async () => {
      const user = userEvent.setup();
      render(<Toolbar {...defaultProps} />);

      const buttons = screen.getAllByRole('button');
      await user.click(buttons[5]); // Fullscreen button

      expect(mockOnFullscreen).toHaveBeenCalledTimes(1);
    });
  });

  describe('leave room journey', () => {
    it('calls onLeave when leave button clicked', async () => {
      const user = userEvent.setup();
      render(<Toolbar {...defaultProps} />);

      const buttons = screen.getAllByRole('button');
      await user.click(buttons[6]); // Leave button (last)

      expect(mockOnLeave).toHaveBeenCalledTimes(1);
    });

    it('leave button has destructive styling', () => {
      render(<Toolbar {...defaultProps} />);

      const buttons = screen.getAllByRole('button');
      const leaveButton = buttons[6];

      expect(leaveButton.className).toContain('destructive');
    });
  });

  describe('combined controls workflow', () => {
    it('allows toggling multiple controls in sequence', async () => {
      const user = userEvent.setup();
      render(<Toolbar {...defaultProps} />);

      const buttons = screen.getAllByRole('button');

      // Toggle audio
      await user.click(buttons[0]);
      expect(mockOnToggleAudio).toHaveBeenCalledTimes(1);

      // Toggle video
      await user.click(buttons[1]);
      expect(mockOnToggleVideo).toHaveBeenCalledTimes(1);

      // Start screen share
      await user.click(buttons[2]);
      expect(mockOnToggleScreenShare).toHaveBeenCalledTimes(1);

      // Open chat
      await user.click(buttons[3]);
      expect(mockOnToggleChat).toHaveBeenCalledTimes(1);
    });
  });
});
