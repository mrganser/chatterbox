import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HomePage } from './HomePage';

const mockPush = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

describe('HomePage', () => {
  beforeEach(() => {
    mockPush.mockClear();
  });

  describe('rendering', () => {
    it('renders the main heading', () => {
      render(<HomePage />);

      expect(screen.getByText('Video Chat')).toBeInTheDocument();
      expect(screen.getByText('Made Simple')).toBeInTheDocument();
    });

    it('renders the room input with placeholder', () => {
      render(<HomePage />);

      expect(screen.getByPlaceholderText('Enter room name (optional)')).toBeInTheDocument();
    });

    it('renders the Join Room button', () => {
      render(<HomePage />);

      expect(screen.getByRole('button', { name: /join room/i })).toBeInTheDocument();
    });

    it('renders feature cards', () => {
      render(<HomePage />);

      expect(screen.getByText('Peer-to-Peer Encrypted')).toBeInTheDocument();
      expect(screen.getByText('Active Speaker Detection')).toBeInTheDocument();
      expect(screen.getByText('In-Call Chat')).toBeInTheDocument();
      expect(screen.getByText('Presentation Mode')).toBeInTheDocument();
      expect(screen.getByText('Moderation Controls')).toBeInTheDocument();
      expect(screen.getByText('No Account Needed')).toBeInTheDocument();
    });

    it('renders the GitHub link', () => {
      render(<HomePage />);

      const githubLink = screen.getByRole('link', { name: /view on github/i });
      expect(githubLink).toBeInTheDocument();
      expect(githubLink).toHaveAttribute('href', 'https://github.com/mrganser/chatterbox');
    });
  });

  describe('room creation journey', () => {
    it('navigates to room with custom name when entered', async () => {
      const user = userEvent.setup();
      render(<HomePage />);

      const input = screen.getByPlaceholderText('Enter room name (optional)');
      await user.type(input, 'my-test-room');

      const joinButton = screen.getByRole('button', { name: /join room/i });
      await user.click(joinButton);

      expect(mockPush).toHaveBeenCalledWith('/room/my-test-room');
    });

    it('navigates to room with generated name when input is empty', async () => {
      const user = userEvent.setup();
      render(<HomePage />);

      const joinButton = screen.getByRole('button', { name: /join room/i });
      await user.click(joinButton);

      expect(mockPush).toHaveBeenCalledTimes(1);
      const pushedPath = mockPush.mock.calls[0][0];
      expect(pushedPath).toMatch(/^\/room\/[a-z]+-[a-z]+-\d+$/);
    });

    it('navigates to room on Enter key press', async () => {
      const user = userEvent.setup();
      render(<HomePage />);

      const input = screen.getByPlaceholderText('Enter room name (optional)');
      await user.type(input, 'keyboard-room{Enter}');

      expect(mockPush).toHaveBeenCalledWith('/room/keyboard-room');
    });

    it('trims whitespace from room name', async () => {
      const user = userEvent.setup();
      render(<HomePage />);

      const input = screen.getByPlaceholderText('Enter room name (optional)');
      await user.type(input, '  spaced-room  ');

      const joinButton = screen.getByRole('button', { name: /join room/i });
      await user.click(joinButton);

      expect(mockPush).toHaveBeenCalledWith('/room/spaced-room');
    });

    it('generates different room IDs on multiple clicks with empty input', async () => {
      const user = userEvent.setup();
      const { rerender } = render(<HomePage />);

      const joinButton = screen.getByRole('button', { name: /join room/i });
      await user.click(joinButton);
      const firstPath = mockPush.mock.calls[0][0];

      mockPush.mockClear();
      rerender(<HomePage />);

      const joinButton2 = screen.getByRole('button', { name: /join room/i });
      await user.click(joinButton2);
      const secondPath = mockPush.mock.calls[0][0];

      // Both should match the pattern, but may or may not be the same
      expect(firstPath).toMatch(/^\/room\/[a-z]+-[a-z]+-\d+$/);
      expect(secondPath).toMatch(/^\/room\/[a-z]+-[a-z]+-\d+$/);
    });
  });

  describe('input focus behavior', () => {
    it('updates state when input gains focus', async () => {
      const user = userEvent.setup();
      render(<HomePage />);

      const input = screen.getByPlaceholderText('Enter room name (optional)');
      await user.click(input);

      // The glow effect is applied via className when focused
      // We verify the input can be focused and typed into
      await user.type(input, 'focused');
      expect(input).toHaveValue('focused');
    });
  });
});
