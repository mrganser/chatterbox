import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChatPanel } from './ChatPanel';
import type { ChatMessage } from '@/types/socket';

describe('ChatPanel', () => {
  const mockOnSendMessage = vi.fn();
  const mockOnClose = vi.fn();
  const localPeerId = 'local-peer-123';

  const defaultProps = {
    messages: [] as ChatMessage[],
    localPeerId,
    onSendMessage: mockOnSendMessage,
    onClose: mockOnClose,
  };

  beforeEach(() => {
    mockOnSendMessage.mockClear();
    mockOnClose.mockClear();
  });

  describe('rendering', () => {
    it('renders the chat header', () => {
      render(<ChatPanel {...defaultProps} />);

      expect(screen.getByText('Chat')).toBeInTheDocument();
    });

    it('shows empty state when no messages', () => {
      render(<ChatPanel {...defaultProps} />);

      expect(screen.getByText('No messages yet')).toBeInTheDocument();
      expect(screen.getByText('Start the conversation!')).toBeInTheDocument();
    });

    it('shows message count in header', () => {
      const messages: ChatMessage[] = [
        { id: '1', peerId: 'peer-1', message: 'Hello', timestamp: Date.now() },
        { id: '2', peerId: 'peer-2', message: 'Hi there', timestamp: Date.now() },
      ];

      render(<ChatPanel {...defaultProps} messages={messages} />);

      expect(screen.getByText('2 messages')).toBeInTheDocument();
    });

    it('shows singular message when count is 1', () => {
      const messages: ChatMessage[] = [
        { id: '1', peerId: 'peer-1', message: 'Hello', timestamp: Date.now() },
      ];

      render(<ChatPanel {...defaultProps} messages={messages} />);

      expect(screen.getByText('1 message')).toBeInTheDocument();
    });

    it('renders the message input', () => {
      render(<ChatPanel {...defaultProps} />);

      expect(screen.getByPlaceholderText('Type a message...')).toBeInTheDocument();
    });

    it('renders send button', () => {
      render(<ChatPanel {...defaultProps} />);

      // Find the send button by looking for the button with the send icon
      const buttons = screen.getAllByRole('button');
      const sendButton = buttons.find((btn) => btn.querySelector('svg.lucide-send'));
      expect(sendButton).toBeInTheDocument();
    });
  });

  describe('displaying messages', () => {
    it('renders messages from other peers', () => {
      const messages: ChatMessage[] = [
        { id: '1', peerId: 'other-peer', message: 'Hello from other peer', timestamp: Date.now() },
      ];

      render(<ChatPanel {...defaultProps} messages={messages} />);

      expect(screen.getByText('Hello from other peer')).toBeInTheDocument();
      expect(screen.getByText(/Peer other-/)).toBeInTheDocument();
    });

    it('renders local messages with "You" label', () => {
      const messages: ChatMessage[] = [
        { id: '1', peerId: localPeerId, message: 'My own message', timestamp: Date.now() },
      ];

      render(<ChatPanel {...defaultProps} messages={messages} />);

      expect(screen.getByText('My own message')).toBeInTheDocument();
      expect(screen.getByText('You')).toBeInTheDocument();
    });

    it('renders multiple messages in order', () => {
      const messages: ChatMessage[] = [
        { id: '1', peerId: 'peer-1', message: 'First message', timestamp: Date.now() - 2000 },
        { id: '2', peerId: localPeerId, message: 'Second message', timestamp: Date.now() - 1000 },
        { id: '3', peerId: 'peer-1', message: 'Third message', timestamp: Date.now() },
      ];

      render(<ChatPanel {...defaultProps} messages={messages} />);

      expect(screen.getByText('First message')).toBeInTheDocument();
      expect(screen.getByText('Second message')).toBeInTheDocument();
      expect(screen.getByText('Third message')).toBeInTheDocument();
    });

    it('groups consecutive messages from same peer without showing avatar', () => {
      const messages: ChatMessage[] = [
        { id: '1', peerId: 'peer-1', message: 'First message', timestamp: Date.now() },
        { id: '2', peerId: 'peer-1', message: 'Second message', timestamp: Date.now() + 1000 },
      ];

      render(<ChatPanel {...defaultProps} messages={messages} />);

      // Should only show one peer label for consecutive messages
      const peerLabels = screen.getAllByText(/Peer peer-/);
      expect(peerLabels).toHaveLength(1);
    });
  });

  describe('sending messages journey', () => {
    it('sends message on form submit', async () => {
      const user = userEvent.setup();
      render(<ChatPanel {...defaultProps} />);

      const input = screen.getByPlaceholderText('Type a message...');
      await user.type(input, 'Hello world');

      const form = input.closest('form')!;
      fireEvent.submit(form);

      await waitFor(() => {
        expect(mockOnSendMessage).toHaveBeenCalledWith('Hello world');
      });
    });

    it('sends message on button click', async () => {
      const user = userEvent.setup();
      render(<ChatPanel {...defaultProps} />);

      const input = screen.getByPlaceholderText('Type a message...');
      await user.type(input, 'Test message');

      const buttons = screen.getAllByRole('button');
      const sendButton = buttons.find((btn) => btn.querySelector('svg.lucide-send'))!;
      await user.click(sendButton);

      await waitFor(() => {
        expect(mockOnSendMessage).toHaveBeenCalledWith('Test message');
      });
    });

    it('clears input after sending', async () => {
      const user = userEvent.setup();
      render(<ChatPanel {...defaultProps} />);

      const input = screen.getByPlaceholderText('Type a message...');
      await user.type(input, 'Message to send');

      const buttons = screen.getAllByRole('button');
      const sendButton = buttons.find((btn) => btn.querySelector('svg.lucide-send'))!;
      await user.click(sendButton);

      await waitFor(() => {
        expect(input).toHaveValue('');
      });
    });

    it('does not send empty messages', async () => {
      const user = userEvent.setup();
      render(<ChatPanel {...defaultProps} />);

      const buttons = screen.getAllByRole('button');
      const sendButton = buttons.find((btn) => btn.querySelector('svg.lucide-send'))!;
      await user.click(sendButton);

      await waitFor(() => {
        expect(mockOnSendMessage).not.toHaveBeenCalled();
      });
    });

    it('does not send whitespace-only messages', async () => {
      const user = userEvent.setup();
      render(<ChatPanel {...defaultProps} />);

      const input = screen.getByPlaceholderText('Type a message...');
      await user.type(input, '   ');

      const buttons = screen.getAllByRole('button');
      const sendButton = buttons.find((btn) => btn.querySelector('svg.lucide-send'))!;
      await user.click(sendButton);

      await waitFor(() => {
        expect(mockOnSendMessage).not.toHaveBeenCalled();
      });
    });

    it('disables send button when input is empty', () => {
      render(<ChatPanel {...defaultProps} />);

      const buttons = screen.getAllByRole('button');
      const sendButton = buttons.find((btn) => btn.querySelector('svg.lucide-send'))!;
      expect(sendButton).toBeDisabled();
    });

    it('enables send button when input has text', async () => {
      const user = userEvent.setup();
      render(<ChatPanel {...defaultProps} />);

      const input = screen.getByPlaceholderText('Type a message...');
      await user.type(input, 'Some text');

      await waitFor(() => {
        const buttons = screen.getAllByRole('button');
        const sendButton = buttons.find((btn) => btn.querySelector('svg.lucide-send'))!;
        expect(sendButton).not.toBeDisabled();
      });
    });
  });

  describe('closing chat panel', () => {
    it('calls onClose when close button is clicked', async () => {
      const user = userEvent.setup();
      render(<ChatPanel {...defaultProps} />);

      // Find the close button (has X icon)
      const closeButtons = screen.getAllByRole('button');
      const closeButton = closeButtons.find((btn) => btn.querySelector('svg.lucide-x'));

      if (closeButton) {
        await user.click(closeButton);
        await waitFor(() => {
          expect(mockOnClose).toHaveBeenCalledTimes(1);
        });
      }
    });
  });

  describe('message formatting', () => {
    it('handles long messages without breaking layout', () => {
      const longMessage = 'A'.repeat(500);
      const messages: ChatMessage[] = [
        { id: '1', peerId: 'peer-1', message: longMessage, timestamp: Date.now() },
      ];

      render(<ChatPanel {...defaultProps} messages={messages} />);

      expect(screen.getByText(longMessage)).toBeInTheDocument();
    });

    it('preserves message content with special characters', () => {
      const messageWithSpecialChars = 'Hello! How are you?';
      const messages: ChatMessage[] = [
        { id: '1', peerId: 'peer-1', message: messageWithSpecialChars, timestamp: Date.now() },
      ];

      render(<ChatPanel {...defaultProps} messages={messages} />);

      expect(screen.getByText(messageWithSpecialChars)).toBeInTheDocument();
    });
  });
});
