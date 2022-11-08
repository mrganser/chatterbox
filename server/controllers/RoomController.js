'use strict';

exports.createJoin = createJoin;
exports.message = message;
exports.disconnect = disconnect;

function createJoin(io, socket, roomName) {
  if (typeof roomName !== 'string') return;

  io.in(roomName)
    .allSockets()
    .then(function (room) {
      if (room && room.size > 4) {
        console.log('Room ' + roomName + ' is full!');
        socket.emit('fullRoom');
        return;
      }

      socket.join(roomName);
      console.log(
        'User ' + socket.id + ' joined room: ' + roomName + '. Number of people in this room now: ' + (room.size + 1)
      );
      socket.emit('joinedRoom', roomName);
      socket.to(roomName).emit('userJoined', { id: socket.id });
    });
}

function message(socket, message) {
  socket.to(message.to).emit('message', Object.assign({ id: socket.id }, message));
}

function disconnect(io, socket, rooms) {
  rooms.forEach(function (room) {
    if (room != socket.id) {
      console.log('User disconnected: ' + socket.id + ' from room: ' + room);
      socket.to(room).emit('leave', { id: socket.id });
    }
  });
}
