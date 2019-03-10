'use strict';

var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var compression = require('compression');
var enforce = require('express-sslify');
const helmet = require('helmet');

var app = express();

if (app.get('env') === 'production') {
  app.enable('trust proxy');
  app.use(enforce.HTTPS({ trustProtoHeader: true }));
  app.use(helmet());
  app.disable('x-powered-by');
}

app.use(compression())

var server = require('http').Server(app);
var io = require('socket.io').listen(server);

var db = null;
var APP_PORT = process.env.PORT || 5000;

var index = require('./routes/index');
var room = require('./routes/room');

//Setup the environment for the application
var initialize = function (callback) {
  /*Pass io to routes*/
  app.use(function (req, res, next) {
    req.io = io;
    next();
  });

  //Configure express
  app.set('views', path.join(__dirname, 'views'));
  app.set('view engine', 'pug');

  app.use(favicon(path.join(__dirname, '..', 'public', 'favicon.ico')));
  app.use(logger('dev'));
  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({ extended: false }));
  app.use(cookieParser());
  app.use(express.static(path.join(__dirname, '..', 'public')));

  app.use('/', index);
  app.use('/room', room);

  //Catch 404 and forward to error handler
  app.use(function (req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
  });

  //Error handlers

  //Development error handler will print stacktrace
  if (app.get('env') === 'development') {
    app.use(function (err, req, res, next) {
      res.status(err.status || 500);
      res.render('error', {
        message: err.message,
        error: err
      });
    });
  }

  //Production error handler no stacktraces leaked to user
  app.use(function (err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: {}
    });
  });

  //Return the callback
  callback(null, app, io);
};

var run = function (callback) {
  server.listen(APP_PORT, function (err) {
    if (err) {
      return callback(err);
    }

    console.log('Server started on port ' + APP_PORT);

    //Return successful start of server
    callback(null);
  });
}

exports.initialize = initialize;
exports.run = run;