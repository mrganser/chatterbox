var express = require('express');
var router = express.Router();
var uuidV4 = require('uuid/v4');
var https = require('https');

router.get('/', function (req, res) {
  res.render('index', { title: 'Chatter Box' });
});

router.post('/goroom', function (req, res) {
  var roomName = req.body.roomName || uuidV4();
  roomName = roomName.substring(0, 32);
  res.redirect('/room/' + roomName);
});

module.exports = router;
