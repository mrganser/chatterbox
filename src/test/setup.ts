import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/',
}));

// Mock MediaStream and related APIs
class MockMediaStream {
  private tracks: MediaStreamTrack[] = [];

  constructor(tracks?: MediaStreamTrack[]) {
    this.tracks = tracks || [];
  }

  getTracks() {
    return this.tracks;
  }

  getVideoTracks() {
    return this.tracks.filter((t) => t.kind === 'video');
  }

  getAudioTracks() {
    return this.tracks.filter((t) => t.kind === 'audio');
  }

  addTrack(track: MediaStreamTrack) {
    this.tracks.push(track);
  }

  removeTrack(track: MediaStreamTrack) {
    this.tracks = this.tracks.filter((t) => t !== track);
  }
}

class MockMediaStreamTrack implements MediaStreamTrack {
  kind: 'video' | 'audio';
  enabled = true;
  readyState: MediaStreamTrackState = 'live';
  id = crypto.randomUUID();
  contentHint = '';
  label = 'mock-track';
  muted = false;
  onended: ((this: MediaStreamTrack, ev: Event) => unknown) | null = null;
  onmute: ((this: MediaStreamTrack, ev: Event) => unknown) | null = null;
  onunmute: ((this: MediaStreamTrack, ev: Event) => unknown) | null = null;

  constructor(kind: 'video' | 'audio') {
    this.kind = kind;
    this.label = `mock-${kind}-track`;
  }

  stop() {
    this.readyState = 'ended';
  }

  clone(): MediaStreamTrack {
    return new MockMediaStreamTrack(this.kind);
  }

  applyConstraints(_constraints?: MediaTrackConstraints): Promise<void> {
    return Promise.resolve();
  }

  getCapabilities(): MediaTrackCapabilities {
    return {};
  }

  getConstraints(): MediaTrackConstraints {
    return {};
  }

  getSettings(): MediaTrackSettings {
    return {};
  }

  addEventListener<K extends keyof MediaStreamTrackEventMap>(
    _type: K,
    _listener: (this: MediaStreamTrack, ev: MediaStreamTrackEventMap[K]) => unknown,
    _options?: boolean | AddEventListenerOptions
  ): void {}

  removeEventListener<K extends keyof MediaStreamTrackEventMap>(
    _type: K,
    _listener: (this: MediaStreamTrack, ev: MediaStreamTrackEventMap[K]) => unknown,
    _options?: boolean | EventListenerOptions
  ): void {}

  dispatchEvent(_event: Event): boolean {
    return true;
  }
}

// Assign mocks to global
Object.defineProperty(global, 'MediaStream', {
  writable: true,
  value: MockMediaStream,
});

Object.defineProperty(global, 'MediaStreamTrack', {
  writable: true,
  value: MockMediaStreamTrack,
});

// Mock getUserMedia
Object.defineProperty(global.navigator, 'mediaDevices', {
  writable: true,
  value: {
    getUserMedia: vi
      .fn()
      .mockResolvedValue(
        new MockMediaStream([new MockMediaStreamTrack('video'), new MockMediaStreamTrack('audio')])
      ),
    getDisplayMedia: vi
      .fn()
      .mockResolvedValue(new MockMediaStream([new MockMediaStreamTrack('video')])),
  },
});

// Mock RTCPeerConnection
class MockRTCPeerConnection {
  localDescription: RTCSessionDescription | null = null;
  remoteDescription: RTCSessionDescription | null = null;
  connectionState = 'new';
  iceConnectionState = 'new';

  createOffer = vi.fn().mockResolvedValue({ type: 'offer', sdp: 'mock-offer' });
  createAnswer = vi.fn().mockResolvedValue({ type: 'answer', sdp: 'mock-answer' });
  setLocalDescription = vi.fn().mockImplementation((desc) => {
    this.localDescription = desc;
    return Promise.resolve();
  });
  setRemoteDescription = vi.fn().mockImplementation((desc) => {
    this.remoteDescription = desc;
    return Promise.resolve();
  });
  addIceCandidate = vi.fn().mockResolvedValue(undefined);
  addTrack = vi.fn();
  removeTrack = vi.fn();
  getSenders = vi.fn().mockReturnValue([]);
  close = vi.fn();

  onicecandidate: ((event: RTCPeerConnectionIceEvent) => void) | null = null;
  ontrack: ((event: RTCTrackEvent) => void) | null = null;
  onconnectionstatechange: (() => void) | null = null;
}

Object.defineProperty(global, 'RTCPeerConnection', {
  writable: true,
  value: MockRTCPeerConnection,
});

// Mock ResizeObserver
class MockResizeObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}

Object.defineProperty(global, 'ResizeObserver', {
  writable: true,
  value: MockResizeObserver,
});

// Mock IntersectionObserver
class MockIntersectionObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}

Object.defineProperty(global, 'IntersectionObserver', {
  writable: true,
  value: MockIntersectionObserver,
});

// Mock AudioContext for active speaker detection
class MockAnalyserNode {
  frequencyBinCount = 128;
  fftSize = 256;
  getByteFrequencyData = vi.fn((array) => {
    for (let i = 0; i < array.length; i++) {
      array[i] = 0;
    }
  });
  connect = vi.fn().mockReturnThis();
  disconnect = vi.fn();
}

class MockAudioContext {
  state = 'running';
  createAnalyser = vi.fn(() => new MockAnalyserNode());
  createMediaStreamSource = vi.fn(() => ({
    connect: vi.fn(),
    disconnect: vi.fn(),
  }));
  close = vi.fn();
}

Object.defineProperty(global, 'AudioContext', {
  writable: true,
  value: MockAudioContext,
});

// Mock clipboard - use configurable to allow userEvent to stub it
Object.defineProperty(navigator, 'clipboard', {
  value: {
    writeText: vi.fn().mockResolvedValue(undefined),
    readText: vi.fn().mockResolvedValue(''),
  },
  writable: true,
  configurable: true,
});

// Mock scrollIntoView
Element.prototype.scrollIntoView = vi.fn();

// Mock requestAnimationFrame
global.requestAnimationFrame = vi.fn((cb) => {
  cb(0);
  return 0;
});
global.cancelAnimationFrame = vi.fn();
