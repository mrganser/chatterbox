'use strict';

var _ = require('lodash');

exports.createJoin = createJoin;
exports.message = message;
exports.disconnect = disconnect;

function createJoin(io, socket, roomName) {
  if (typeof roomName !== 'string') return;
  
  var room = io.sockets.adapter.rooms[roomName];
  if (room && room.length > 4) {
    console.log('Room ' + roomName + ' is full!');
    socket.emit('fullRoom');
    return;
  } 

  socket.join(roomName, function() {
    console.log('User ' + socket.id + ' joined room: ' + roomName);
    socket.emit('joinedRoom', roomName);
    socket.to(roomName).emit('userJoined', {id: socket.id});
  });
}

function message(socket, message) {
  socket.to(message.to).emit('message', _.assign({id: socket.id}, message));
}

function disconnect(io, socket, rooms) {
  _.forEach(rooms, function(room) {
    if (room != socket.id) {
      console.log('User disconnected: ' + socket.id + ' from room: ' + room);
      socket.to(room).emit('leave', {id: socket.id});
    }
  });
}