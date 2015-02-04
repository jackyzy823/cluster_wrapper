var Redis = require('redis');
var crc16 = require('./lib/crc16.js');
var parseSlots = require('./lib/slot_parser.js');
var to_array = require("./lib/to_array");


/*
  @params: redisServers -> json format servers config [{port:xx[,host:xx[,slots:"1,2,3~100,101,105-200,xx"]]},{port:xxx}]
*/
function createClient(redisServers) {
  if (!redisServers) {
    throw new Error('need init configs');
    return null;
  }
  Array.isArray(redisServers) || (redisServers = [redisServers]);
  var clientsMap = {};
  var slotsPool = new Array(16384); //0->16383
  /*Initialize pool */
  var client = null;
  redisServers.forEach(function(server) {
    var host = server.host || '127.0.0.1';
    if (!server.port) {
      console.log(server);
      throw new Error('port should be defined!');
    }
    var port = server.port;
    var slots = parseSlots(server.slots);
    /*TODO*/
    /*client should be compatible with node_redis */
    /*What if cluster is offline after init?*/
    /*Not described in redis cluster spec*/
    client = Redis.createClient(port, host);
    /*client.address ip or domain?*/
    clientsMap[client.address] = client;
    slots && slots.forEach(function(item) {
      slotsPool[item] = client;
    });
  });
  /*Set empty slots*/
  var keys = Object.keys(clientsMap);
  var size = keys.length - 1;
  for (var i = 0; i < 16384; i++) {
    slotsPool[i] || (slotsPool[i] = clientsMap[keys[Math.random() * size >> 0]]);
  }
  return new clusterClient(clientsMap, slotsPool);
}

module.exports.createClient = createClient;

function clusterClient(clientsMap, slotsPool) {
    this.clientsMap = clientsMap;
    this.slotsPool = slotsPool;
    return;
  }
  // module.exports.clusterClient = clusterClient;


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
  /*see redis-rb-cluster Line:131*/
  /*Add 'select' as described in redis cluster document*/
  if (command in ['info', 'multi', 'exec', 'slaveof', 'config', 'shutdown', 'select']) {
    clusterClient.prototype[command] = function(args, callback) {
      if (Array.isArray(args) && typeof callback === "function") {
        callback(new Error(command, ' is not support in cluster mode'));
        return;
      }
      var tmpCallback = to_array(arguments).pop();
      if (typeof tmpCallback === "function") {
        tmpCallback(new Error(command, ' is not support in cluster mode'));
        return;
      }
      /*TODO*/
      /*No callback what to do next? just silently ignore?*/
    };
  } else {
    clusterClient.prototype[command] = function(args, callback) {
      if (Array.isArray(args) && typeof callback === "function") {
        return this.send_command(command, args, callback);
      } else {
        return this.send_command(command, to_array(arguments));
      }
    };
  };
  clusterClient.prototype[command.toUpperCase()] = clusterClient.prototype[command];

});

clusterClient.prototype.send_command = function(command, args, callback) {
  var self = this;
  console.log("use cluster agent");
  //
  //do sthing to process command and arguments
  //
  var key = args[0];
  console.log('keys', key);
  if (!callback && typeof args[args.length - 1] == 'function') {
    callback = args.pop();
  }
  console.log('args', args);
  console.log('callback', callback);
  var client = this.slotsPool[crc16(key)];
  console.log('current slot first use port', client.connectionOption.port);
  client[command](args, function wrapCallback(err, reply) {
    var tmpClient = null;

    /*DEBUG ONLY*/
    self.DebugError = err;
    self.DebugReply = reply;
    /*DEBUG ONLY*/

    var errType = null,
      errMsg = null;
    err && (errType = err.message.split(' ')[0]);
    err && (errMsg = err.message.split(' ').splice(1).join(' '));
    /*MOVED will update slotsmap and ASK will not ,as described in cluster-spec*/
    if (errType == 'ASK' || errType == 'MOVED') {
      var tmpReply = errMsg.split(' ');
      var dstClient = tmpReply[1];
      var dstSlot = parseInt(tmpReply[0]);
      var tmpInfo = dstClient.split(':');
      var host = tmpInfo[0];
      var port = parseInt(tmpInfo[1]);

      /*update client info*/
      var tmpClient = self.clientsMap[dstClient];
      if (!tmpClient) {
        /*New online client*/
        tmpClient = Redis.createClient(port, host);
        self.clientsMap[tmpClient.address] = tmpClient;
      }
    }
    if (errType == 'ASK') {
      console.log("ask using address", tmpClient.address);
      tmpClient.asking(function(error, reply) {
        if (error) {
          callback && callback(error, reply); //use this reply to retrun the outer callback;
          return;
        }
        console.log('args', args);
        tmpClient[command](args, callback); //use outer callback
        return;
      });
    } else if (errType == 'MOVED') {
      /*update slots cache after MOVED*/
      self.slotsPool[dstSlot] = tmpClient;
      console.log("moevd using address", tmpClient.address);
      console.log('args', args);
      tmpClient[command](args, callback);
      return;
    } else {
      console.log('no cluster err(MOVED/ASK)');
      callback && callback(err, reply);
      return;
    }
  });
}



/*Imply asking if node_redis not imply*/
if (!Redis.RedisClient.prototype.asking) {
  Redis.RedisClient.prototype.asking = function(callback) {
    return this.send_command('asking', [], callback);
  };

  clusterClient.prototype.asking = function(callback) {
    return this.send_command('asking', [], callback);
  };
}