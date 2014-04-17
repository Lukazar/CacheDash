/**
* Handles endpoints for memcach functionality
*
*/
  
var memcache = require('memcache');
var rand = require('node-random');
var async = require('async');
  
process.on('message', function(obj) {
  
  //  @p/param  {Object}  connectionDetails  Connection information for memcache server
  var Poller = function(connectionDetails) { 
     this.connection = new memcache.Client(connectionDetails.port, connectionDetails.host);
     this.hashKeys = {};
  }
  
  //
  //  Iterate over active slabs getting keys
  //
  //  TODO: Abstract delete/add detection into their own functions and use async/better algo to get diffs (sort keys on first iteration etc)
  //  TODO: Investigate which memcached stats detail to use for detecting changes in memcached (if no changes, don't fire, duh!) 
  
  Poller.prototype.emitKeyDeltas = function() {
    var currentKeys = this.hashKeys;
    var _parent = this;
    //get all slabs
    if(!this.isConnected()) {
      process.send({action: 'generalException', emitData: ['NOTCONNECTED']});
      process.disconnect();
      return;
    }
    this.connection.stats('slabs', function(err, statsInfo) {
      //iterate over slabs
      async.times(statsInfo.active_slabs, function(slabIdx, next) {
        var cacheDumpCmd = 'cachedump ' + slabIdx.toString() + ' 0';       
        if(!_parent.isConnected()) {
          process.send({action: 'generalException', emitData: ['NOTCONNECTED']});
          process.disconnect();
          return;
        }
        _parent.connection.stats(cacheDumpCmd, function(err, slabs) {
          next(err, true);
          async.parallel({
         
            //add keys that don't exist
            added: function(callback) {
              var addedKeys = [];
              for(keyName in slabs) {
                // key does not exist in current list
                if(typeof currentKeys[keyName] === 'undefined') {
                  currentKeys[keyName] = slabs[keyName];
                  //TODO: look into using objects and not hardcoded array indexes
                  addedKeys.push([keyName, slabs[keyName][0], slabs[keyName][1]]);
                } 
              }
             
              callback(null, addedKeys);
            },
  
            // remove keys that no longer exist
            deleted: function(callback) {
              var deletedKeys = [];
              for(keyName in currentKeys) {
                for(newKeyName in slabs) {
                  if(currentKeys[newKeyName] === 'undefined') {
                    delete currentKeys[newKeyName];
                    deletedKeys.push(newKeyName);
                  }
                }
              }
              callback(null,deletedKeys);
            },
          }, function(err, keyChanges) {
             //send key changes to main proc
             process.send({action: 'keysDelta', emitData: keyChanges});
          });    
        });
      }, function(err, slabSuccess) {
         if(err) {
           //emit errors back to main socket io
           process.send({action: 'generalException', emitData: err});
           process.disconnect();
         } else {
           // doin it all over again
           setTimeout(_parent.emitKeyDeltas, 10000);
         }
      });
    });
  } 
  
  //Helper function to determine if polling connection is alive
  Poller.prototype.isConnected = function() {
   var isPollingAlive = this.pollingConnection && this.pollingConnection.conn && this.pollingConnection.conn.readable === true;
   return isPollingAlive;
  
  }
  new Poller(); 
}
