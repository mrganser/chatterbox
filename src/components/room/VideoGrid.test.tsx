import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { VideoGrid } from './VideoGrid';
import type { RemotePeer } from '@/types/webrtc';

// Mock VideoTile to simplify testing
vi.mock('./VideoTile', () => ({
  VideoTile: ({
    peerId,
    isLocal,
    isScreenShare,
    label,
    compact,
  }: {
    peerId: string;
    isLocal?: boolean;
    isScreenShare?: boolean;
    label?: string;
    compact?: boolean;
  }) => (
    <div
      data-testid={`video-tile-${peerId}`}
      data-local={isLocal}
      data-screen-share={isScreenShare}
      data-label={label}
      data-compact={compact}
    >
      Video Tile: {peerId}
      {isLocal && ' (local)'}
      {isScreenShare && ' (screen share)'}
      {label && ` - ${label}`}
    </div>
  ),
}));

import { vi } from 'vitest';

describe('VideoGrid', () => {
  const createMockPeer = (id: string, stream: MediaStream | null = null): RemotePeer => ({
    id,
    stream,
    connection: {} as RTCPeerConnection,
  });

  const defaultProps = {
    localStream: null as MediaStream | null,
    localPeerId: 'local-123',
    peers: [] as RemotePeer[],
    activeSpeakerId: null,
    speakerLevels: new Map<string, number>(),
    videoEnabled: true,
    audioEnabled: true,
  };

  describe('rendering participants', () => {
    it('renders local video tile when alone', () => {
      render(<VideoGrid {...defaultProps} />);

      expect(screen.getByTestId('video-tile-local-123')).toBeInTheDocument();
      expect(screen.getByText(/\(local\)/)).toBeInTheDocument();
    });

    it('renders remote peers', () => {
      const peers = [createMockPeer('peer-1'), createMockPeer('peer-2')];

      render(<VideoGrid {...defaultProps} peers={peers} />);

      expect(screen.getByTestId('video-tile-local-123')).toBeInTheDocument();
      expect(screen.getByTestId('video-tile-peer-1')).toBeInTheDocument();
      expect(screen.getByTestId('video-tile-peer-2')).toBeInTheDocument();
    });

    it('renders correct number of tiles for multiple peers', () => {
      const peers = [createMockPeer('peer-1'), createMockPeer('peer-2'), createMockPeer('peer-3')];

      render(<VideoGrid {...defaultProps} peers={peers} />);

      // 1 local + 3 remote = 4 tiles
      const tiles = screen.getAllByTestId(/^video-tile-/);
      expect(tiles).toHaveLength(4);
    });
  });

  describe('screen sharing - local sharing', () => {
    it('switches to presentation mode when sharing screen', () => {
      const screenShareStream = new MediaStream();

      render(
        <VideoGrid {...defaultProps} isScreenSharing={true} screenShareStream={screenShareStream} />
      );

      expect(screen.getByTestId('video-tile-screen-share')).toBeInTheDocument();
      expect(screen.getByText(/Your screen/)).toBeInTheDocument();
    });

    it('shows local video as compact thumbnail in presentation mode', () => {
      const screenShareStream = new MediaStream();

      render(
        <VideoGrid {...defaultProps} isScreenSharing={true} screenShareStream={screenShareStream} />
      );

      const localTile = screen.getByTestId('video-tile-local-123');
      expect(localTile).toHaveAttribute('data-compact', 'true');
    });

    it('shows remote peers as compact thumbnails in presentation mode', () => {
      const screenShareStream = new MediaStream();
      const peers = [createMockPeer('peer-1')];

      render(
        <VideoGrid
          {...defaultProps}
          peers={peers}
          isScreenSharing={true}
          screenShareStream={screenShareStream}
        />
      );

      const remoteTile = screen.getByTestId('video-tile-peer-1');
      expect(remoteTile).toHaveAttribute('data-compact', 'true');
    });
  });

  describe('screen sharing - remote sharing', () => {
    it('switches to presentation mode when remote peer shares screen', () => {
      const remotePeer = createMockPeer('peer-1', new MediaStream());
      const peers = [remotePeer];

      render(<VideoGrid {...defaultProps} peers={peers} screenSharingPeerId="peer-1" />);

      expect(screen.getByTestId('video-tile-screen-share')).toBeInTheDocument();
      expect(screen.getByText(/peer-1's screen/)).toBeInTheDocument();
    });

    it('excludes sharing peer from thumbnails when remote is sharing', () => {
      const sharingPeer = createMockPeer('peer-1', new MediaStream());
      const otherPeer = createMockPeer('peer-2', new MediaStream());
      const peers = [sharingPeer, otherPeer];

      render(<VideoGrid {...defaultProps} peers={peers} screenSharingPeerId="peer-1" />);

      // peer-1 should not appear as a regular tile (only as screen share)
      // peer-2 should appear as thumbnail
      expect(screen.getByTestId('video-tile-peer-2')).toBeInTheDocument();
      expect(screen.queryByTestId('video-tile-peer-1')).not.toBeInTheDocument();
    });
  });

  describe('active speaker indication', () => {
    it('passes active speaker info to tiles', () => {
      const peers = [createMockPeer('peer-1')];
      const speakerLevels = new Map([
        ['local-123', 50],
        ['peer-1', 30],
      ]);

      render(
        <VideoGrid
          {...defaultProps}
          peers={peers}
          activeSpeakerId="local-123"
          speakerLevels={speakerLevels}
        />
      );

      // Both tiles should be rendered - actual speaking indicator logic
      // is handled in VideoTile component
      expect(screen.getByTestId('video-tile-local-123')).toBeInTheDocument();
      expect(screen.getByTestId('video-tile-peer-1')).toBeInTheDocument();
    });
  });

  describe('grid layout variations', () => {
    it('handles single participant layout', () => {
      render(<VideoGrid {...defaultProps} peers={[]} />);

      const tiles = screen.getAllByTestId(/^video-tile-/);
      expect(tiles).toHaveLength(1);
    });

    it('handles 2 participant layout', () => {
      const peers = [createMockPeer('peer-1')];

      render(<VideoGrid {...defaultProps} peers={peers} />);

      const tiles = screen.getAllByTestId(/^video-tile-/);
      expect(tiles).toHaveLength(2);
    });

    it('handles 3 participant layout', () => {
      const peers = [createMockPeer('peer-1'), createMockPeer('peer-2')];

      render(<VideoGrid {...defaultProps} peers={peers} />);

      const tiles = screen.getAllByTestId(/^video-tile-/);
      expect(tiles).toHaveLength(3);
    });

    it('handles 4 participant layout', () => {
      const peers = [createMockPeer('peer-1'), createMockPeer('peer-2'), createMockPeer('peer-3')];

      render(<VideoGrid {...defaultProps} peers={peers} />);

      const tiles = screen.getAllByTestId(/^video-tile-/);
      expect(tiles).toHaveLength(4);
    });

    it('handles 6 participant layout', () => {
      const peers = [
        createMockPeer('peer-1'),
        createMockPeer('peer-2'),
        createMockPeer('peer-3'),
        createMockPeer('peer-4'),
        createMockPeer('peer-5'),
      ];

      render(<VideoGrid {...defaultProps} peers={peers} />);

      const tiles = screen.getAllByTestId(/^video-tile-/);
      expect(tiles).toHaveLength(6);
    });

    it('handles large number of participants', () => {
      const peers = Array.from({ length: 8 }, (_, i) => createMockPeer(`peer-${i + 1}`));

      render(<VideoGrid {...defaultProps} peers={peers} />);

      const tiles = screen.getAllByTestId(/^video-tile-/);
      expect(tiles).toHaveLength(9); // 1 local + 8 remote
    });
  });

  describe('no screen share scenario', () => {
    it('uses grid layout when no screen sharing', () => {
      const peers = [createMockPeer('peer-1')];

      render(
        <VideoGrid
          {...defaultProps}
          peers={peers}
          isScreenSharing={false}
          screenShareStream={null}
          screenSharingPeerId={null}
        />
      );

      // Should not have screen share tile
      expect(screen.queryByTestId('video-tile-screen-share')).not.toBeInTheDocument();

      // Local tile should not be compact
      const localTile = screen.getByTestId('video-tile-local-123');
      expect(localTile).not.toHaveAttribute('data-compact', 'true');
    });
  });
});
