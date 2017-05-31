'use strict';

var env = require('./env');
var RoomController = require('./controllers/RoomController');

env.initialize(function (err, app, io) {
  if (err) throw err;

  // Websocket api
  io.sockets.on('connection', function (socket) {

    socket.on('createJoin', function (room) {
      RoomController.createJoin(io, socket, room);
    });

    socket.on('message', function (message) {
      RoomController.message(socket, message);
    });

    socket.on('disconnecting', function () {
      var rooms = Object.keys(socket.rooms);
      RoomController.disconnect(io, socket, rooms);
    });

  });

  // Run the server
  env.run(function (err) {
    if (err) throw err;
  });
});