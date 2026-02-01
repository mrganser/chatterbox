import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { VideoTile } from './VideoTile';

// Mock HTMLVideoElement.play since JSDOM doesn't implement it
Object.defineProperty(HTMLVideoElement.prototype, 'play', {
  writable: true,
  value: vi.fn().mockResolvedValue(undefined),
});

function createMockStream(): MediaStream {
  return {
    getTracks: vi.fn().mockReturnValue([]),
    getVideoTracks: vi.fn().mockReturnValue([]),
    getAudioTracks: vi.fn().mockReturnValue([]),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  } as unknown as MediaStream;
}

describe('VideoTile', () => {
  let mockStream: MediaStream;

  beforeEach(() => {
    vi.clearAllMocks();
    mockStream = createMockStream();
  });

  describe('display name', () => {
    it('shows label when provided', () => {
      render(
        <VideoTile stream={mockStream} peerId="peer-123" label="Custom Label" name="Test User" />
      );

      expect(screen.getByText('Custom Label')).toBeInTheDocument();
    });

    it('shows "You" for local peer without name', () => {
      render(<VideoTile stream={mockStream} peerId="local-123" isLocal />);

      expect(screen.getByText('You')).toBeInTheDocument();
    });

    it('shows name for local peer when provided', () => {
      render(<VideoTile stream={mockStream} peerId="local-123" isLocal name="My Name" />);

      expect(screen.getByText('My Name')).toBeInTheDocument();
    });

    it('shows name for remote peer when provided', () => {
      render(<VideoTile stream={mockStream} peerId="remote-123" name="Remote User" />);

      expect(screen.getByText('Remote User')).toBeInTheDocument();
    });

    it('shows truncated peer ID when no name provided for remote', () => {
      render(<VideoTile stream={mockStream} peerId="abc123xyz789" />);

      expect(screen.getByText('Peer abc123')).toBeInTheDocument();
    });
  });

  describe('video rendering', () => {
    it('renders video element', () => {
      render(<VideoTile stream={mockStream} peerId="peer-123" />);

      const video = document.querySelector('video');
      expect(video).toBeInTheDocument();
    });

    it('sets muted for local video', () => {
      render(<VideoTile stream={mockStream} peerId="peer-123" isLocal />);

      const video = document.querySelector('video') as HTMLVideoElement;
      // React renders muted as a boolean property, not an attribute
      expect(video.muted).toBe(true);
    });

    it('mirrors local video (not screen share)', () => {
      render(<VideoTile stream={mockStream} peerId="peer-123" isLocal />);

      const video = document.querySelector('video');
      expect(video).toHaveClass('scale-x-[-1]');
    });

    it('does not mirror remote video', () => {
      render(<VideoTile stream={mockStream} peerId="peer-123" />);

      const video = document.querySelector('video');
      expect(video).not.toHaveClass('scale-x-[-1]');
    });

    it('does not mirror local screen share', () => {
      render(<VideoTile stream={mockStream} peerId="peer-123" isLocal isScreenShare />);

      const video = document.querySelector('video');
      expect(video).not.toHaveClass('scale-x-[-1]');
    });
  });

  describe('avatar fallback', () => {
    it('shows avatar when stream is null', () => {
      render(<VideoTile stream={null} peerId="peer-123" />);

      // Avatar container has mesh-gradient class
      const avatar = document.querySelector('.mesh-gradient');
      expect(avatar).toBeInTheDocument();
    });

    it('shows avatar when video is disabled', () => {
      render(<VideoTile stream={mockStream} peerId="peer-123" videoEnabled={false} />);

      const avatar = document.querySelector('.mesh-gradient');
      expect(avatar).toBeInTheDocument();
    });

    it('hides avatar when video is enabled with stream', () => {
      render(<VideoTile stream={mockStream} peerId="peer-123" videoEnabled={true} />);

      const avatar = document.querySelector('.mesh-gradient');
      expect(avatar).not.toBeInTheDocument();
    });

    it('renders smaller avatar in compact mode', () => {
      render(<VideoTile stream={null} peerId="peer-123" compact />);

      // Compact mode uses h-12 w-12, normal uses h-20 w-20
      const avatarCircle = document.querySelector('.h-12.w-12');
      expect(avatarCircle).toBeInTheDocument();
    });
  });

  describe('status indicators', () => {
    it('shows mic off indicator when audio disabled', () => {
      render(<VideoTile stream={mockStream} peerId="peer-123" audioEnabled={false} />);

      // MicOff icon is in a destructive background container
      const micOffContainer = document.querySelector('.bg-destructive\\/80');
      expect(micOffContainer).toBeInTheDocument();
    });

    it('shows video off indicator when video disabled', () => {
      render(<VideoTile stream={mockStream} peerId="peer-123" videoEnabled={false} />);

      const indicators = document.querySelectorAll('.bg-destructive\\/80');
      expect(indicators.length).toBeGreaterThan(0);
    });

    it('shows both indicators when both disabled', () => {
      render(
        <VideoTile
          stream={mockStream}
          peerId="peer-123"
          audioEnabled={false}
          videoEnabled={false}
        />
      );

      const indicators = document.querySelectorAll('.bg-destructive\\/80');
      expect(indicators.length).toBe(2);
    });

    it('hides indicators when both enabled', () => {
      render(
        <VideoTile stream={mockStream} peerId="peer-123" audioEnabled={true} videoEnabled={true} />
      );

      const indicators = document.querySelectorAll('.bg-destructive\\/80');
      expect(indicators.length).toBe(0);
    });

    it('hides indicators for screen share', () => {
      render(
        <VideoTile
          stream={mockStream}
          peerId="peer-123"
          isScreenShare
          audioEnabled={false}
          videoEnabled={false}
        />
      );

      const indicators = document.querySelectorAll('.bg-destructive\\/80');
      expect(indicators.length).toBe(0);
    });

    it('uses smaller indicators in compact mode', () => {
      render(<VideoTile stream={mockStream} peerId="peer-123" audioEnabled={false} compact />);

      const indicator = document.querySelector('.h-5.w-5');
      expect(indicator).toBeInTheDocument();
    });
  });

  describe('speaking indicator', () => {
    it('adds speaking border class when speaker level exceeds threshold', () => {
      const { container } = render(
        <VideoTile stream={mockStream} peerId="peer-123" speakerLevel={20} />
      );

      const tile = container.firstChild as HTMLElement;
      expect(tile).toHaveClass('border-primary/50');
    });

    it('does not add speaking class below threshold', () => {
      const { container } = render(
        <VideoTile stream={mockStream} peerId="peer-123" speakerLevel={10} />
      );

      const tile = container.firstChild as HTMLElement;
      expect(tile).not.toHaveClass('border-primary/50');
    });

    it('applies glow style when speaking', () => {
      const { container } = render(
        <VideoTile stream={mockStream} peerId="peer-123" speakerLevel={30} />
      );

      const tile = container.firstChild as HTMLElement;
      expect(tile.style.boxShadow).toContain('rgba(0, 245, 212');
    });

    it('no glow style when not speaking', () => {
      const { container } = render(
        <VideoTile stream={mockStream} peerId="peer-123" speakerLevel={0} />
      );

      const tile = container.firstChild as HTMLElement;
      expect(tile.style.boxShadow).toBe('');
    });
  });

  describe('click handler', () => {
    it('calls onClick when tile is clicked', () => {
      const handleClick = vi.fn();

      const { container } = render(
        <VideoTile stream={mockStream} peerId="peer-123" onClick={handleClick} />
      );

      fireEvent.click(container.firstChild as HTMLElement);

      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('adds cursor-pointer class when onClick provided', () => {
      const { container } = render(
        <VideoTile stream={mockStream} peerId="peer-123" onClick={() => {}} />
      );

      const tile = container.firstChild as HTMLElement;
      expect(tile).toHaveClass('cursor-pointer');
    });

    it('does not have cursor-pointer when no onClick', () => {
      const { container } = render(<VideoTile stream={mockStream} peerId="peer-123" />);

      const tile = container.firstChild as HTMLElement;
      expect(tile).not.toHaveClass('cursor-pointer');
    });
  });

  describe('moderation menu', () => {
    const mockModeration = {
      onMute: vi.fn(),
      onDisableVideo: vi.fn(),
      onKick: vi.fn(),
    };

    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('shows moderation menu for remote peers', () => {
      render(<VideoTile stream={mockStream} peerId="peer-123" moderation={mockModeration} />);

      // Menu trigger button should exist
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('hides moderation menu for local peer', () => {
      render(
        <VideoTile stream={mockStream} peerId="peer-123" isLocal moderation={mockModeration} />
      );

      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    it('hides moderation menu for screen share', () => {
      render(
        <VideoTile
          stream={mockStream}
          peerId="peer-123"
          isScreenShare
          moderation={mockModeration}
        />
      );

      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    it('hides moderation menu when not provided', () => {
      render(<VideoTile stream={mockStream} peerId="peer-123" />);

      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    it('shows mute option when audio is enabled', () => {
      render(
        <VideoTile
          stream={mockStream}
          peerId="peer-123"
          audioEnabled={true}
          moderation={mockModeration}
        />
      );

      // Open the dropdown menu first
      fireEvent.click(screen.getByRole('button'));

      expect(screen.getByText('Mute')).toBeInTheDocument();
    });

    it('hides mute option when audio is disabled', () => {
      render(
        <VideoTile
          stream={mockStream}
          peerId="peer-123"
          audioEnabled={false}
          moderation={mockModeration}
        />
      );

      // Open the dropdown menu first
      fireEvent.click(screen.getByRole('button'));

      expect(screen.queryByText('Mute')).not.toBeInTheDocument();
    });

    it('shows disable video option when video is enabled', () => {
      render(
        <VideoTile
          stream={mockStream}
          peerId="peer-123"
          videoEnabled={true}
          moderation={mockModeration}
        />
      );

      // Open the dropdown menu first
      fireEvent.click(screen.getByRole('button'));

      expect(screen.getByText('Disable video')).toBeInTheDocument();
    });

    it('hides disable video option when video is disabled', () => {
      render(
        <VideoTile
          stream={mockStream}
          peerId="peer-123"
          videoEnabled={false}
          moderation={mockModeration}
        />
      );

      // Open the dropdown menu first
      fireEvent.click(screen.getByRole('button'));

      expect(screen.queryByText('Disable video')).not.toBeInTheDocument();
    });

    it('always shows kick option', () => {
      render(<VideoTile stream={mockStream} peerId="peer-123" moderation={mockModeration} />);

      // Open the dropdown menu first
      fireEvent.click(screen.getByRole('button'));

      expect(screen.getByText('Kick')).toBeInTheDocument();
    });

    it('calls onMute with peerId when mute clicked', () => {
      render(
        <VideoTile
          stream={mockStream}
          peerId="peer-123"
          audioEnabled={true}
          moderation={mockModeration}
        />
      );

      // Open the dropdown menu first
      fireEvent.click(screen.getByRole('button'));
      fireEvent.click(screen.getByText('Mute'));

      expect(mockModeration.onMute).toHaveBeenCalledWith('peer-123');
    });

    it('calls onDisableVideo with peerId when disable video clicked', () => {
      render(
        <VideoTile
          stream={mockStream}
          peerId="peer-123"
          videoEnabled={true}
          moderation={mockModeration}
        />
      );

      // Open the dropdown menu first
      fireEvent.click(screen.getByRole('button'));
      fireEvent.click(screen.getByText('Disable video'));

      expect(mockModeration.onDisableVideo).toHaveBeenCalledWith('peer-123');
    });

    it('calls onKick with peerId when kick clicked', () => {
      render(<VideoTile stream={mockStream} peerId="peer-123" moderation={mockModeration} />);

      // Open the dropdown menu first
      fireEvent.click(screen.getByRole('button'));
      fireEvent.click(screen.getByText('Kick'));

      expect(mockModeration.onKick).toHaveBeenCalledWith('peer-123');
    });
  });

  describe('layout modes', () => {
    it('uses aspect-video by default', () => {
      const { container } = render(<VideoTile stream={mockStream} peerId="peer-123" />);

      const tile = container.firstChild as HTMLElement;
      expect(tile).toHaveClass('aspect-video');
    });

    it('removes aspect-video in fill mode', () => {
      const { container } = render(<VideoTile stream={mockStream} peerId="peer-123" fill />);

      const tile = container.firstChild as HTMLElement;
      expect(tile).not.toHaveClass('aspect-video');
    });

    it('removes aspect-video for screen share', () => {
      const { container } = render(
        <VideoTile stream={mockStream} peerId="peer-123" isScreenShare />
      );

      const tile = container.firstChild as HTMLElement;
      expect(tile).not.toHaveClass('aspect-video');
    });

    it('uses object-contain for screen share video', () => {
      render(<VideoTile stream={mockStream} peerId="peer-123" isScreenShare />);

      const video = document.querySelector('video');
      expect(video).toHaveClass('object-contain');
    });

    it('uses object-cover for normal video', () => {
      render(<VideoTile stream={mockStream} peerId="peer-123" />);

      const video = document.querySelector('video');
      expect(video).toHaveClass('object-cover');
    });
  });

  describe('compact mode', () => {
    it('uses smaller padding in compact mode', () => {
      const { container } = render(<VideoTile stream={mockStream} peerId="peer-123" compact />);

      // Info bar uses p-2 in compact, p-3 otherwise
      const infoBar = container.querySelector('.p-2');
      expect(infoBar).toBeInTheDocument();
    });

    it('uses smaller text in compact mode', () => {
      render(<VideoTile stream={mockStream} peerId="peer-123" name="Test" compact />);

      const nameBadge = screen.getByText('Test');
      expect(nameBadge).toHaveClass('text-[10px]');
    });

    it('uses smaller gradient in compact mode', () => {
      const { container } = render(<VideoTile stream={mockStream} peerId="peer-123" compact />);

      const gradient = container.querySelector('.h-16');
      expect(gradient).toBeInTheDocument();
    });
  });

  describe('custom className', () => {
    it('applies custom className to container', () => {
      const { container } = render(
        <VideoTile stream={mockStream} peerId="peer-123" className="my-custom-class" />
      );

      const tile = container.firstChild as HTMLElement;
      expect(tile).toHaveClass('my-custom-class');
    });
  });
});
