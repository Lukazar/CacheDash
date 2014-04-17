
/**
 * Module dependencies.
 */

var express = require('express');
var http = require('http');
var path = require('path');
var async = require('async');

var app = express();

// all environments
app.set('port', process.env.PORT || 3000);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hjs');


app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.json());
app.use(express.urlencoded());
app.use(express.methodOverride());
app.use(express.cookieParser('your secret here'));
app.use(express.session());
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));

// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}

var httpServ = http.createServer(app);
socketio = require('socket.io').listen(httpServ);

httpServ.listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});
var memcacheRoute = require('./routes/memcache.js');
socketio.of('/memcache').on('connection',function(socket) { 
  console.log('new connection from socket.io');
  var newRoute = new memcacheRoute(socket);
});
