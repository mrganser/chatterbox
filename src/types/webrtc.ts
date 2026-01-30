export interface RemotePeer {
  id: string;
  stream: MediaStream | null;
  connection: RTCPeerConnection;
  videoEnabled: boolean;
  audioEnabled: boolean;
}

export interface LocalStreamState {
  stream: MediaStream | null;
  videoEnabled: boolean;
  audioEnabled: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface ScreenShareState {
  stream: MediaStream | null;
  isSharing: boolean;
  error: string | null;
}

export const DEFAULT_ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];
