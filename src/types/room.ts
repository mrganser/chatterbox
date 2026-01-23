export type RoomStatus = 'idle' | 'joining' | 'connected' | 'error';

export interface RoomState {
  roomId: string | null;
  peerId: string | null;
  status: RoomStatus;
  error: string | null;
}
