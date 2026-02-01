import type { Server as SocketIOServer, Socket } from 'socket.io';

// Room management
const rooms = new Map<
  string,
  { peers: Map<string, { name?: string; videoEnabled: boolean; audioEnabled: boolean }> }
>();

function leaveRoom(socket: Socket, roomId: string) {
  const room = rooms.get(roomId);
  if (room) {
    room.peers.delete(socket.id);
    socket.leave(roomId);
    socket.to(roomId).emit('peer-left', { peerId: socket.id });

    if (room.peers.size === 0) {
      rooms.delete(roomId);
    }
    console.log(`${socket.id} left room ${roomId}`);
  }
}

function getPeerName(
  rooms: Map<string, { peers: Map<string, { name?: string }> }>,
  roomId: string,
  peerId: string
): string | undefined {
  return rooms.get(roomId)?.peers.get(peerId)?.name;
}

export function setupSocketHandlers(io: SocketIOServer) {
  io.on('connection', (socket) => {
    console.log(`Client connected: ${socket.id}`);
    let currentRoomId: string | null = null;

    socket.on(
      'join-room',
      ({
        roomId,
        name,
        videoEnabled = true,
        audioEnabled = true,
      }: {
        roomId: string;
        name?: string;
        videoEnabled?: boolean;
        audioEnabled?: boolean;
      }) => {
        if (currentRoomId) {
          leaveRoom(socket, currentRoomId);
        }

        currentRoomId = roomId;

        if (!rooms.has(roomId)) {
          rooms.set(roomId, { peers: new Map() });
        }

        const room = rooms.get(roomId)!;
        const existingPeers = Array.from(room.peers.entries()).map(([id, data]) => ({
          id,
          name: data.name,
          videoEnabled: data.videoEnabled,
          audioEnabled: data.audioEnabled,
        }));

        room.peers.set(socket.id, { name, videoEnabled, audioEnabled });
        socket.join(roomId);

        socket.emit('room-joined', {
          roomId,
          peerId: socket.id,
          peers: existingPeers,
        });

        socket.to(roomId).emit('peer-joined', {
          peerId: socket.id,
          name,
          videoEnabled,
          audioEnabled,
        });
        console.log(`${socket.id}${name ? ` (${name})` : ''} joined room ${roomId}`);
      }
    );

    socket.on('leave-room', () => {
      if (currentRoomId) {
        leaveRoom(socket, currentRoomId);
        currentRoomId = null;
      }
    });

    socket.on('offer', ({ to, offer }: { to: string; offer: RTCSessionDescriptionInit }) => {
      io.to(to).emit('offer', { from: socket.id, offer });
    });

    socket.on('answer', ({ to, answer }: { to: string; answer: RTCSessionDescriptionInit }) => {
      io.to(to).emit('answer', { from: socket.id, answer });
    });

    socket.on(
      'ice-candidate',
      ({ to, candidate }: { to: string; candidate: RTCIceCandidateInit }) => {
        io.to(to).emit('ice-candidate', { from: socket.id, candidate });
      }
    );

    socket.on('chat-message', ({ message }: { message: string }) => {
      if (currentRoomId) {
        const peerName = getPeerName(rooms, currentRoomId, socket.id);
        const chatMessage = {
          id: `${socket.id}-${Date.now()}`,
          peerId: socket.id,
          peerName,
          message,
          timestamp: Date.now(),
        };
        io.to(currentRoomId).emit('chat-message', chatMessage);
      }
    });

    socket.on('screen-share-started', ({ streamId }: { streamId: string }) => {
      if (currentRoomId) {
        socket.to(currentRoomId).emit('screen-share-started', { peerId: socket.id, streamId });
      }
    });

    socket.on('screen-share-stopped', () => {
      if (currentRoomId) {
        socket.to(currentRoomId).emit('screen-share-stopped', { peerId: socket.id });
      }
    });

    socket.on(
      'media-state-changed',
      ({ videoEnabled, audioEnabled }: { videoEnabled: boolean; audioEnabled: boolean }) => {
        if (currentRoomId) {
          // Update stored state
          const room = rooms.get(currentRoomId);
          const peerData = room?.peers.get(socket.id);
          if (peerData) {
            peerData.videoEnabled = videoEnabled;
            peerData.audioEnabled = audioEnabled;
          }
          socket
            .to(currentRoomId)
            .emit('media-state-changed', { peerId: socket.id, videoEnabled, audioEnabled });
        }
      }
    );

    socket.on('moderation-mute', ({ targetPeerId }: { targetPeerId: string }) => {
      io.to(targetPeerId).emit('moderation-mute', { fromPeerId: socket.id });
    });

    socket.on('moderation-unmute', ({ targetPeerId }: { targetPeerId: string }) => {
      io.to(targetPeerId).emit('moderation-unmute', { fromPeerId: socket.id });
    });

    socket.on('moderation-disable-video', ({ targetPeerId }: { targetPeerId: string }) => {
      io.to(targetPeerId).emit('moderation-disable-video', { fromPeerId: socket.id });
    });

    socket.on('moderation-enable-video', ({ targetPeerId }: { targetPeerId: string }) => {
      io.to(targetPeerId).emit('moderation-enable-video', { fromPeerId: socket.id });
    });

    socket.on('moderation-kick', ({ targetPeerId }: { targetPeerId: string }) => {
      io.to(targetPeerId).emit('moderation-kick', { fromPeerId: socket.id });
    });

    socket.on('disconnect', () => {
      console.log(`Client disconnected: ${socket.id}`);
      if (currentRoomId) {
        leaveRoom(socket, currentRoomId);
      }
    });
  });
}
