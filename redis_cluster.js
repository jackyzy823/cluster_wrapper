var Redis = require('redis')
var crc16 = requre('./redis_crc.js')
var config = require('./config/config.js')
var utils = require('./utils.js')

var clientsMap = {}
var slotsPool = {}


/*Initialize pool */

var client = null;
for (var server in config.redisServers) {
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
// set empty slots
var size = Object.keys(clientsMap).length - 1;
for (var i = 0; i < 16384; i++) {
  slotsPool[i] || slotsPool[i] = clientsMap[Math.random() * size >> 0];
}
//unref client
client = null;


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
  //for now
  // do not support for multi
});

clusterClient.prototype.send_command = function(command, args, callback) {
  console.log("use cluster agent");
  //
  //do sthing to process command and arguments
  //
  var key = args[0];
  var client = slotsPool[crc16(key)];

  client[command](args, function wrap_cb(err, reply) {
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


  })


}
//
Redis.RedisClient.prototype.asking = function(){

}

// Redis.RedisClient.prototype.send_command = function(){

// }


function clusterClient() {

}


// clusterClient.prototype.set = function(key,value,callback) {
//  var client = slotsPool[crc16(key)];
//  client.set(key,value,function wrap_cb(err,reply){
//    if(err == 'MOVED'){

//    }
//  })

// };