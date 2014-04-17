var memcacheLib = require('../lib/memcache.js');
var async = require('async');




/**
* Creates a socket io & memcache bridge with two connections, for polling and normal ops
* @param  {Object}  socket  Socket.io object to bridge the memcacheLib with
**/
var MemcacheSocket = function(socket) { 
  this.socket = socket;
  this.memcacheConnection = null;
  this.pollingKeys = false; 
  var _parent = this;

  this.socket.on('newConnection', function (connectionDetails, clientCallback) {
    _parent.pollingKeys = false;
    _parent.memcacheConnection = null;
    _parent.createMemcacheConnections(connectionDetails, function(errs) {
      if(errs) {
        clientCallback(errs);
      } else {

        // bind crud & enable and launch key change polling
        _parent.bindCRUD();
        _parent.pollingKeys = true;
        _parent.emitKeyChanges();

        // back to client socket io 
        clientCallback();
      }
    });
  });

}




/**
* Binds basic CRUD operations from socket io to memcache library
* @param  {Object}  callback  Callback that accepts error, data as params. 
**/
MemcacheSocket.prototype.bindCRUD = function() {
  var _parent = this;
  this.socket.on('get', function(keyName, clientCallback) {
   if(_parent.memcacheConnection.isConnected()) {
     _parent.memcacheConnection.connection.get(keyName, function(err, data) {
       var keyObj = {};
       try { keyObj = JSON.parse(data); } catch(err) { keyObj = data; }
       clientCallback(err, keyObj);
     });
   } else {
     _parent.socket.emit('generalException', ['NOTCONNECTED']);
   }
  });
}




/**
* create new memcache library object and prepare connections for polling & crud ops
* @param  {Object}  connectionDetails  Memcache connection config in key value form. Format is native module format.
* @param  {Object}  callback           Callback after connections are setup, accepts error param
*
**/
MemcacheSocket.prototype.createMemcacheConnections = function(connectionDetails, callback) {
    var _parent = this;

    //client requested memcache connection, create and bind events
    this.memcacheConnection = new memcacheLib(connectionDetails);
    async.series([
       //create connection for basic actions
      function(callback) {
        _parent.memcacheConnection.connection.on('error', function(err) { callback([err.code]); });
        _parent.memcacheConnection.connection.on('timeout', function() { callback(['ECONNTIMEOUT']); });
        _parent.memcacheConnection.connection.on('close', function() { 
console.log('close on connection');
          _parent.socket.emit('generalException',['ECONNCLOSED']);
        });
        _parent.memcacheConnection.connection.on('disconnect', function () {
console.log('disconnect on connection');
          _parent.pollingKeys = true;
        });
        _parent.memcacheConnection.connection.on('connect', function() {
          callback(null, true);
        });
        _parent.memcacheConnection.connection.connect();
      },

      //create connection to poll with
      function(callback) {
        _parent.memcacheConnection.pollingConnection.on('error', function(err) { callback([err.code]); });
        _parent.memcacheConnection.pollingConnection.on('timeout', function() { callback(['ECONNTIMEOUT']); });
        _parent.memcacheConnection.pollingConnection.on('close', function() { 
console.log('close on pollingConnection');
          _parent.socket.emit('generalException',['ECONNCLOSED']); 
        });     
 
        _parent.memcacheConnection.pollingConnection.on('disconnect', function() {
console.log('disconnect on pollingConnection');
          _parent.pollingKeys = false;
        });
      
        _parent.memcacheConnection.pollingConnection.on('connect',function() { 
          callback(null, true);
        });
        _parent.memcacheConnection.pollingConnection.connect();
      }
    ], function(err, connections) {
         if(err) {
           callback(err);
         } else {
           callback();
         }
    });
// TODO : create proper flow to create both connections with single function 
// (provide object with functions to configure connection callbacks)

}

//TODO: Move looping emitter to child process
// https://github.com/andygup/node-background-processor/blob/master/index.js
/**
* Gathers key deltas and emits them back to client. Continue looping as long as polling is enabled.
**/
MemcacheSocket.prototype.emitKeyChanges = function() {
  //get all keys, get changes, emit error or deltas

   var _parent = this;
   if(!this.memcacheConnection) return;
   this.memcacheConnection.emitKeyDeltas(function(err, keysChanged) {
     if(err) {
       _parent.socket.emit('generalException', err);
     } else {
       var keysHaveChanged = ((keysChanged.added.length || 0) + (keysChanged.deleted.length || 0)) > 0;
       if(keysHaveChanged) {
         _parent.socket.emit('keysDelta', keysChanged);
       }
     }
   },
   function(err, slabChanges) {
     if(err) {
       _parent.socket.emit('generalException', err);
     } else if(_parent.pollingKeys === true) {
       //WE DOIN IT ALL OVER AGAIN, YO
       setTimeout(function() { _parent.emitKeyChanges(); }, 10000);
     }
   });   
}

module.exports = MemcacheSocket;
