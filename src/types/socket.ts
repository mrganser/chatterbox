export interface ServerToClientEvents {
  'room-joined': (data: { roomId: string; peerId: string; peers: string[] }) => void;
  'peer-joined': (data: { peerId: string }) => void;
  'peer-left': (data: { peerId: string }) => void;
  offer: (data: { from: string; offer: RTCSessionDescriptionInit }) => void;
  answer: (data: { from: string; answer: RTCSessionDescriptionInit }) => void;
  'ice-candidate': (data: { from: string; candidate: RTCIceCandidateInit }) => void;
  'chat-message': (data: ChatMessage) => void;
  'screen-share-started': (data: { peerId: string }) => void;
  'screen-share-stopped': (data: { peerId: string }) => void;
  'media-state-changed': (data: {
    peerId: string;
    videoEnabled: boolean;
    audioEnabled: boolean;
  }) => void;
  error: (data: { message: string }) => void;
}

export interface ClientToServerEvents {
  'join-room': (data: { roomId: string }) => void;
  'leave-room': () => void;
  offer: (data: { to: string; offer: RTCSessionDescriptionInit }) => void;
  answer: (data: { to: string; answer: RTCSessionDescriptionInit }) => void;
  'ice-candidate': (data: { to: string; candidate: RTCIceCandidateInit }) => void;
  'chat-message': (data: { message: string }) => void;
  'screen-share-started': () => void;
  'screen-share-stopped': () => void;
  'media-state-changed': (data: { videoEnabled: boolean; audioEnabled: boolean }) => void;
}

export interface ChatMessage {
  id: string;
  peerId: string;
  message: string;
  timestamp: number;
}
