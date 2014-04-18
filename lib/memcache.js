/**
* Handles endpoints for memcach functionality
*
*/

var memcache = require('memcached');
var rand = require('node-random');
var async = require('async');

//
//  Object constructor, create new memcache connection and initialize object properties
//
//  @p/param  {Object}  connectionDetails  Connection information for memcache server
var Memcache = function(connectionDetails) { 
  
  console.log(connectionDetails.server);
  
   this.connection = new memcache(connectionDetails.server);
   this.pollingConnection = new memcache(connectionDetails.server);
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
  
  connection.items(function(err, result){
    if(err){
      console.log(err);
    } else {
      result.forEach(function(itemSet){
        var keys = Object.keys(itemSet), count = 0;
        keys.pop(); //don't need the server key
        console.log('#########');        
        keys.forEach(function(stats){          
          connection.cachedump(itemSet.server, parseInt(stats), itemSet[stats].number, function(err, response){            
            
            var addedKeys = [];
            
            if(err){
              console.log(err);
            } else if(count == keys.length){
              finalCallback();
              console.log('complete');
              setTimeout(function(){
                console.log('polling');
                _parent.emitKeyDelta(deltaCallback, finalCallback)
              }, 10000);
              
            } else if(!!response.length) {                                          
              //find added keys                
              response.forEach(function(value){                
                if(typeof currentKeys[value.key] == 'undefined'){                  
                  currentKeys[value.key] = value;                    
                  addedKeys.push([value.key, value.b, value.s]);                    
                }                  
              });                              
              deltaCallback(null, addedKeys)
              
              //XXX Memcache doesn't remove keys... it invalidates them, but name will still exists, right?                                         
            }                                              
          });
        });        
      });
    }
  });    
} 

//Helper function to determine if polling connection is alive
Memcache.prototype.isConnected = function() {
  return this.pollingConnection && this.connection
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
