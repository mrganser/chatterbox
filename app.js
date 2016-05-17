var env = require('./env');

env.initialize(function(err, app, io) {  
    if (err) throw err;

    //
    // Websocket api
    //
    io.sockets.on('connection', function (socket) {

        socket.on('createJoin', function (room) {
            if (typeof room !== 'string') return;

            var numClients = 0;
            if (io.sockets.adapter.rooms[room]){
                numClients = io.sockets.adapter.rooms[room].length;
            }

            if (numClients < 2) {
                socket.join(room);
                socket.emit('joinedRoom', room);
            } else {
                socket.emit('fullRoom');
            }
        });

        socket.on('message', function (room, message) {
            io.to(room).emit('message', message);
        });

    });

    //
    // Run the server
    //  
    env.run(function(err) {
        if (err) throw err;
    });
});