export interface ServerToClientEvents {
  'room-joined': (data: {
    roomId: string;
    peerId: string;
    peers: Array<{ id: string; name?: string; videoEnabled: boolean; audioEnabled: boolean }>;
  }) => void;
  'peer-joined': (data: {
    peerId: string;
    name?: string;
    videoEnabled: boolean;
    audioEnabled: boolean;
  }) => void;
  'peer-left': (data: { peerId: string }) => void;
  offer: (data: { from: string; offer: RTCSessionDescriptionInit }) => void;
  answer: (data: { from: string; answer: RTCSessionDescriptionInit }) => void;
  'ice-candidate': (data: { from: string; candidate: RTCIceCandidateInit }) => void;
  'chat-message': (data: ChatMessage) => void;
  'screen-share-started': (data: { peerId: string; streamId: string }) => void;
  'screen-share-stopped': (data: { peerId: string }) => void;
  'media-state-changed': (data: {
    peerId: string;
    videoEnabled: boolean;
    audioEnabled: boolean;
  }) => void;
  'moderation-mute': (data: { fromPeerId: string }) => void;
  'moderation-unmute': (data: { fromPeerId: string }) => void;
  'moderation-disable-video': (data: { fromPeerId: string }) => void;
  'moderation-enable-video': (data: { fromPeerId: string }) => void;
  'moderation-kick': (data: { fromPeerId: string }) => void;
  error: (data: { message: string }) => void;
}

export interface ClientToServerEvents {
  'join-room': (data: {
    roomId: string;
    name?: string;
    videoEnabled?: boolean;
    audioEnabled?: boolean;
  }) => void;
  'leave-room': () => void;
  offer: (data: { to: string; offer: RTCSessionDescriptionInit }) => void;
  answer: (data: { to: string; answer: RTCSessionDescriptionInit }) => void;
  'ice-candidate': (data: { to: string; candidate: RTCIceCandidateInit }) => void;
  'chat-message': (data: { message: string }) => void;
  'screen-share-started': (data: { streamId: string }) => void;
  'screen-share-stopped': () => void;
  'media-state-changed': (data: { videoEnabled: boolean; audioEnabled: boolean }) => void;
  'moderation-mute': (data: { targetPeerId: string }) => void;
  'moderation-unmute': (data: { targetPeerId: string }) => void;
  'moderation-disable-video': (data: { targetPeerId: string }) => void;
  'moderation-enable-video': (data: { targetPeerId: string }) => void;
  'moderation-kick': (data: { targetPeerId: string }) => void;
}

export interface ChatMessage {
  id: string;
  peerId: string;
  peerName?: string;
  message: string;
  timestamp: number;
}
