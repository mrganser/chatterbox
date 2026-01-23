import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { VideoRoom } from './VideoRoom';

// Mock all the child components to simplify testing
vi.mock('./VideoGrid', () => ({
  VideoGrid: () => <div data-testid="video-grid">Video Grid</div>,
}));

vi.mock('./ShareDialog', () => ({
  ShareDialog: ({ open }: { open: boolean }) =>
    open ? <div data-testid="share-dialog">Share this room</div> : null,
}));

// Create mock functions outside to access them in tests
const mockJoinRoom = vi.fn();
const mockLeaveRoom = vi.fn();
const mockToggleVideo = vi.fn();
const mockToggleAudio = vi.fn();
const mockStartScreenShare = vi.fn().mockResolvedValue(null);
const mockStopScreenShare = vi.fn();
const mockReplaceVideoTrack = vi.fn();
const mockSendMessage = vi.fn();
const mockToggleChat = vi.fn();
const mockCloseChat = vi.fn();

// Track mock state that can be modified per test
let mockRoomStatus: 'idle' | 'joining' | 'connected' | 'error' = 'idle';
let mockError: string | null = null;
let mockIsScreenSharing = false;
let mockChatIsOpen = false;
let mockChatUnreadCount = 0;

vi.mock('@/hooks/useRoom', () => ({
  useRoom: () => ({
    roomState: {
      roomId: mockRoomStatus === 'connected' ? 'test-room' : null,
      peerId: mockRoomStatus === 'connected' ? 'local-peer-123' : null,
      status: mockRoomStatus,
      error: mockError,
    },
    isConnected: true,
    localStream: {
      stream: mockRoomStatus === 'connected' ? new MediaStream() : null,
      videoEnabled: true,
      audioEnabled: true,
      toggleVideo: mockToggleVideo,
      toggleAudio: mockToggleAudio,
      error: null,
    },
    screenShare: {
      stream: null,
      isSharing: mockIsScreenSharing,
      startScreenShare: mockStartScreenShare,
      stopScreenShare: mockStopScreenShare,
      error: null,
    },
    screenSharingPeerId: null,
    peers: [],
    activeSpeakerId: null,
    speakerLevels: new Map(),
    chat: {
      messages: [],
      isOpen: mockChatIsOpen,
      unreadCount: mockChatUnreadCount,
      sendMessage: mockSendMessage,
      toggleChat: mockToggleChat,
      closeChat: mockCloseChat,
    },
    joinRoom: mockJoinRoom,
    leaveRoom: mockLeaveRoom,
    replaceVideoTrack: mockReplaceVideoTrack,
  }),
}));

const mockPush = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

describe('VideoRoom', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRoomStatus = 'idle';
    mockError = null;
    mockIsScreenSharing = false;
    mockChatIsOpen = false;
    mockChatUnreadCount = 0;
  });

  describe('pre-call state (idle)', () => {
    it('renders PreCallActions when status is idle', () => {
      render(<VideoRoom roomId="test-room" />);

      expect(screen.getByText(/ready to join/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /join room/i })).toBeInTheDocument();
    });

    it('shows room ID in pre-call screen', () => {
      render(<VideoRoom roomId="my-special-room" />);

      expect(screen.getByText(/my-special-room/)).toBeInTheDocument();
    });

    it('calls joinRoom when Join Room button is clicked', async () => {
      const user = userEvent.setup();
      render(<VideoRoom roomId="test-room" />);

      const joinButton = screen.getByRole('button', { name: /join room/i });
      await user.click(joinButton);

      expect(mockJoinRoom).toHaveBeenCalledTimes(1);
    });
  });

  describe('joining state', () => {
    it('shows loading state when joining', () => {
      mockRoomStatus = 'joining';
      render(<VideoRoom roomId="test-room" />);

      expect(screen.getByText('Joining room...')).toBeInTheDocument();
    });
  });

  describe('error state', () => {
    it('shows error message when there is an error', () => {
      mockRoomStatus = 'error';
      mockError = 'Failed to access camera';

      render(<VideoRoom roomId="test-room" />);

      expect(screen.getByText(/failed to access camera/i)).toBeInTheDocument();
    });

    it('allows retry when in error state', async () => {
      mockRoomStatus = 'error';
      mockError = 'Connection failed';

      const user = userEvent.setup();
      render(<VideoRoom roomId="test-room" />);

      const retryButton = screen.getByRole('button', { name: /try again/i });
      await user.click(retryButton);

      expect(mockJoinRoom).toHaveBeenCalledTimes(1);
    });
  });

  describe('connected state - main video room', () => {
    beforeEach(() => {
      mockRoomStatus = 'connected';
    });

    it('renders the video grid when connected', () => {
      render(<VideoRoom roomId="test-room" />);

      expect(screen.getByTestId('video-grid')).toBeInTheDocument();
    });

    it('renders toolbar buttons when connected', () => {
      render(<VideoRoom roomId="test-room" />);

      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('toggles video when video button is clicked', async () => {
      const user = userEvent.setup();
      render(<VideoRoom roomId="test-room" />);

      const buttons = screen.getAllByRole('button');
      const videoButton = buttons.find(
        (btn) => btn.querySelector('svg.lucide-video') || btn.querySelector('svg.lucide-video-off')
      );

      expect(videoButton).toBeTruthy();
      await user.click(videoButton!);
      expect(mockToggleVideo).toHaveBeenCalledTimes(1);
    });

    it('toggles audio when audio button is clicked', async () => {
      const user = userEvent.setup();
      render(<VideoRoom roomId="test-room" />);

      const buttons = screen.getAllByRole('button');
      const audioButton = buttons.find(
        (btn) => btn.querySelector('svg.lucide-mic') || btn.querySelector('svg.lucide-mic-off')
      );

      expect(audioButton).toBeTruthy();
      await user.click(audioButton!);
      expect(mockToggleAudio).toHaveBeenCalledTimes(1);
    });

    it('toggles chat when chat button is clicked', async () => {
      const user = userEvent.setup();
      render(<VideoRoom roomId="test-room" />);

      const buttons = screen.getAllByRole('button');
      const chatButton = buttons.find((btn) => btn.querySelector('svg.lucide-message-square'));

      expect(chatButton).toBeTruthy();
      await user.click(chatButton!);
      expect(mockToggleChat).toHaveBeenCalledTimes(1);
    });

    it('leaves room and navigates home when leave button is clicked', async () => {
      const user = userEvent.setup();
      render(<VideoRoom roomId="test-room" />);

      const buttons = screen.getAllByRole('button');
      const leaveButton = buttons.find((btn) => btn.querySelector('svg.lucide-phone-off'));

      expect(leaveButton).toBeTruthy();
      await user.click(leaveButton!);
      expect(mockLeaveRoom).toHaveBeenCalledTimes(1);
      expect(mockPush).toHaveBeenCalledWith('/');
    });

    it('opens share dialog when share button is clicked', async () => {
      const user = userEvent.setup();
      render(<VideoRoom roomId="test-room" />);

      const buttons = screen.getAllByRole('button');
      const shareButton = buttons.find((btn) => btn.querySelector('svg.lucide-share-2'));

      expect(shareButton).toBeTruthy();
      await user.click(shareButton!);

      await waitFor(() => {
        expect(screen.getByTestId('share-dialog')).toBeInTheDocument();
      });
    });
  });

  describe('screen sharing controls', () => {
    beforeEach(() => {
      mockRoomStatus = 'connected';
    });

    it('triggers screen share when button clicked', async () => {
      const user = userEvent.setup();
      mockStartScreenShare.mockResolvedValue(new MediaStream());

      render(<VideoRoom roomId="test-room" />);

      const buttons = screen.getAllByRole('button');
      const screenButton = buttons.find(
        (btn) =>
          btn.querySelector('svg.lucide-monitor') || btn.querySelector('svg.lucide-monitor-off')
      );

      expect(screenButton).toBeTruthy();
      await user.click(screenButton!);
      expect(mockStartScreenShare).toHaveBeenCalledTimes(1);
    });

    it('stops screen share when already sharing', async () => {
      mockIsScreenSharing = true;
      const user = userEvent.setup();

      render(<VideoRoom roomId="test-room" />);

      const buttons = screen.getAllByRole('button');
      const screenButton = buttons.find((btn) => btn.querySelector('svg.lucide-monitor-off'));

      expect(screenButton).toBeTruthy();
      await user.click(screenButton!);
      expect(mockStopScreenShare).toHaveBeenCalledTimes(1);
    });
  });

  describe('chat panel', () => {
    beforeEach(() => {
      mockRoomStatus = 'connected';
    });

    it('shows chat panel when chat is open', () => {
      mockChatIsOpen = true;
      render(<VideoRoom roomId="test-room" />);

      expect(screen.getByText('Chat')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Type a message...')).toBeInTheDocument();
    });

    it('shows unread count badge on chat button', () => {
      mockChatUnreadCount = 3;

      render(<VideoRoom roomId="test-room" />);

      expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('sends message through chat panel', async () => {
      mockChatIsOpen = true;
      const user = userEvent.setup();
      render(<VideoRoom roomId="test-room" />);

      const input = screen.getByPlaceholderText('Type a message...');
      await user.type(input, 'Hello world');

      const form = input.closest('form')!;
      form.dispatchEvent(new Event('submit', { bubbles: true }));

      expect(mockSendMessage).toHaveBeenCalledWith('Hello world');
    });

    it('closes chat when close button is clicked', async () => {
      mockChatIsOpen = true;
      const user = userEvent.setup();
      render(<VideoRoom roomId="test-room" />);

      const closeButtons = screen.getAllByRole('button');
      const closeButton = closeButtons.find((btn) => btn.querySelector('svg.lucide-x'));

      expect(closeButton).toBeTruthy();
      await user.click(closeButton!);
      expect(mockCloseChat).toHaveBeenCalledTimes(1);
    });
  });
});
