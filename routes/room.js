var express = require('express');
var path = require('path');
var url = require('url');
var router = express.Router();

router.get('/:roomName', function (req, res) {
  var roomName = req.params.roomName;
  roomName = roomName.substring(0, 32);
  
  var urlToShare = url.format({
    protocol: req.protocol,
    host: req.get('host'),
    pathname: req.baseUrl
  }) + '/' + roomName;

  res.render('room', { title: 'Room', roomName: roomName, urlToShare: urlToShare });
});

module.exports = router;
