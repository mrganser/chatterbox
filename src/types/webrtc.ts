export interface RemotePeer {
  id: string;
  name?: string;
  stream: MediaStream | null;
  screenStream: MediaStream | null;
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
  { urls: 'stun:stun.cloudflare.com:3478' },
];
