var express = require('express');
var path = require('path');
var router = express.Router();

router.get('/:roomName', function (req, res) {
  var roomName = req.params.roomName;
  roomName = roomName.substring(0, 32);

  res.render('room', { title: 'Room', roomName: roomName });
});

module.exports = router;
