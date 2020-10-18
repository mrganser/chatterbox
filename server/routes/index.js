'use strict';

var express = require('express');
var router = express.Router();
var { v4: uuidv4 } = require('uuid');
var https = require('https');

router.get('/', function (req, res) {
  res.render('index', { title: 'Chatter Box' });
});

router.post('/goroom', function (req, res) {
  var roomName = req.body.roomName || uuidv4();
  roomName = roomName.substring(0, 32);
  res.redirect('/room/' + roomName);
});

module.exports = router;
