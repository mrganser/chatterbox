var express = require('express');
var path = require('path');
var router = express.Router();

/* Access videochat */
router.get('/', function(req, res) {
	res.render('videochat', {title: 'Videochat'});
});

module.exports = router;
