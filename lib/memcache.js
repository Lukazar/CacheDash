/**
* Handles endpoints for memcach functionality
*
*/

var memcache = require('memcache');
var rand = require('node-random');
var async = require('async');

//
//  Object constructor, create new memcache connection and initialize object properties
//
//  @p/param  {Object}  connectionDetails  Connection information for memcache server
var Memcache = function(connectionDetails) { 
   this.connection = new memcache.Client(connectionDetails.port, connectionDetails.host);
   this.pollingConnection = new memcache.Client(connectionDetails.port, connectionDetails.host);
   this.hashKeys = {};
}

//
//  Iterate over active slabs getting keys
//
// @param {Object} deltaCallback Callback in err, val format for changes on each slab iteration
// @param {Object} finalCallback Callback in err, val format after all slabs are iterated.

//  TODO: Abstract delete/add detection into their own functions and use async/better algo to get diffs (sort keys on first iteration etc)
//  TODO: Investigate which memcached stats detail to use for detecting changes in memcached (if no changes, don't fire, duh!) 

Memcache.prototype.emitKeyDeltas = function(deltaCallback, finalCallback) {
  var connection = this.pollingConnection;
  var currentKeys = this.hashKeys;
  var _parent = this;
  //get all slabs
  if(!this.isConnected()) {
    finalCallback(['NOTCONNECTED']);
    return;
  }
  connection.stats('slabs', function(err, statsInfo) {
    //iterate over slabs
    async.times(statsInfo.active_slabs, function(slabIdx, next) {
      var cacheDumpCmd = 'cachedump ' + slabIdx.toString() + ' 0';       
      if(!_parent.isConnected()) {
        callback(['NOTCONNECTED']);
        return;
      }
      connection.stats(cacheDumpCmd, function(err, slabs) {
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
           deltaCallback(err, keyChanges)  
        });    
      });
    }, finalCallback);
  });
} 

//Helper function to determine if polling connection is alive
Memcache.prototype.isConnected = function() {
 var isPollingAlive = this.pollingConnection && this.pollingConnection.conn && this.pollingConnection.conn.readable === true;
 var isCrudAlive = this.connection && this.connection.conn && this.connection.conn.readable === true;
 return isPollingAlive && isCrudAlive;

}

/**
*  Generates and sets random keys in memcached for testing
*
*  
*/
Memcache.prototype.genKey = function(req, res) {
  rand.strings({
   length : 20,
   number : 10,
   digits: false,
   upper: false
  },function(err, randomKeys) {
    console.log(err);
    if(err) {
      res.json(err);
    } else {
      async.each(randomKeys, function itemIterator(randomKey, callback) {
        memcacheServer.set(randomKey,randomKey, 9000,function(err, result) {
          (err) ? callback(err) : callback()
        });
      }, function asyncComplete(err) {
        (err) ? res.json(err) : res.json({success: true});
      });
    }
  });
}




/**
* Gets a single key and returns in json format
*
*
*
*/
Memcache.prototype.getKey = function(keyName,callback) { 
    this.connection.get(keyName, callback);
}


module.exports = Memcache;
