var Redis = require('redis')
var crc16 = requre('./redis_crc.js')
// var config = require('./config/config.js')
var utils = require('./utils.js')


var clientsMap = {}
var slotsPool = {}

/*
  @params: redisServers -> json format servers config {port:xx[,host:xx[,slots:"1,2,3-100,101,105-200,xx"]]}
*/

function clusterClient(redisServers) {
  /*Initialize pool */
  var client = null;
  for (var server in redisServers) {
    var host = server.host || 'localhost';
    var port = server.port ||
      throw new Exception('port should not be undefined!');
    var slots = utils.parseSlots(server.slots);
    client = Redis.createClient(port, host);
    clientsMap[host + ':' + port] = client;
    slots && slots.forEach(function(item) {
      slotsPool[item] = client
    });
  }
  /*Set empty slots*/
  var size = Object.keys(clientsMap).length - 1;
  for (var i = 0; i < 16384; i++) {
    slotsPool[i] || slotsPool[i] = clientsMap[Math.random() * size >> 0];
  }
}
module.exports.clusterClient = clusterClient;


//copy from node_redis/index.js
function set_union(seta, setb) {
  var obj = {};
  seta.forEach(function(val) {
    obj[val] = true;
  });
  setb.forEach(function(val) {
    obj[val] = true;
  });
  return Object.keys(obj);
}

// This static list of commands is updated from time to time.  ./lib/commands.js can be updated with generate_commands.js
commands = set_union(["get", "set", "setnx", "setex", "append", "strlen", "del", "exists", "setbit", "getbit", "setrange", "getrange", "substr",
  "incr", "decr", "mget", "rpush", "lpush", "rpushx", "lpushx", "linsert", "rpop", "lpop", "brpop", "brpoplpush", "blpop", "llen", "lindex",
  "lset", "lrange", "ltrim", "lrem", "rpoplpush", "sadd", "srem", "smove", "sismember", "scard", "spop", "srandmember", "sinter", "sinterstore",
  "sunion", "sunionstore", "sdiff", "sdiffstore", "smembers", "zadd", "zincrby", "zrem", "zremrangebyscore", "zremrangebyrank", "zunionstore",
  "zinterstore", "zrange", "zrangebyscore", "zrevrangebyscore", "zcount", "zrevrange", "zcard", "zscore", "zrank", "zrevrank", "hset", "hsetnx",
  "hget", "hmset", "hmget", "hincrby", "hdel", "hlen", "hkeys", "hvals", "hgetall", "hexists", "incrby", "decrby", "getset", "mset", "msetnx",
  "randomkey", "select", "move", "rename", "renamenx", "expire", "expireat", "keys", "dbsize", "auth", "ping", "echo", "save", "bgsave",
  "bgrewriteaof", "shutdown", "lastsave", "type", "multi", "exec", "discard", "sync", "flushdb", "flushall", "sort", "info", "monitor", "ttl",
  "persist", "slaveof", "debug", "config", "subscribe", "unsubscribe", "psubscribe", "punsubscribe", "publish", "watch", "unwatch", "cluster",
  "restore", "migrate", "dump", "object", "client", "eval", "evalsha"
], require("./lib/commands"));

commands.forEach(function(fullCommand) {
  var command = fullCommand.split(' ')[0];

  clusterClient.prototype[command] = function(args, callback) {
    if (Array.isArray(args) && typeof callback === "function") {
      return this.send_command(command, args, callback);
    } else {
      return this.send_command(command, to_array(arguments));
    }
  };
  clusterClient.prototype[command.toUpperCase()] = clusterClient.prototype[command];
  //TODO
  //for now do not support for multi
});

clusterClient.prototype.send_command = function(command, args, callback) {
  console.log("use cluster agent");
  //
  //do sthing to process command and arguments
  //
  var key = args[0];
  var client = slotsPool[crc16(key)];

  client[command](args, function wrap_cb(err, reply) {
    var tmpClient = null;
    if (err == 'MOVED' || err == 'ASK' ) {
      var dstClient = 'some ip:port';
      var dstSlot = 'some slots';
      var tmpInfo = dstClient.split(':');
      var host = tmpInfo[0];
      var port = parseInt(tmpInfo[1]);

      //update client info and slot info
      var tmpClient = clientsMap[dstClient];
      if (!tmpClient) {
        tmpClient = Redis.createClient(port, host);
        clientsMap[dstClient] = tmpClient;
      }
      slotsPool[dstSlot] = tmpClient;
    }
    if( err == 'ASK'){
      tmpClient.asking(function(error,reply){
        if(error){
          //dosthinng
          callback && callback(error,reply); //use this reply to retrun the outer ;
          return;
        }
        tmpClient[command](args,callback); //use outer callback
        return;
      });
    }
    else if(err == 'MOVED'){
      tmpClient[command](args,callback);
      return;
    }
    else{
      callback && callback(err,reply);
      return;
    }

  })


}
//imply asking
Redis.RedisClient.prototype.asking = function (callback) {
  return this.send_command('asking', [], callback);
};

// Redis.RedisClient.prototype.send_command = function(){

// }


