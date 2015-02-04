var Redis = require('redis');
var crc16 = require('./lib/crc16.js');
var parseSlots = require('./lib/slot_parser.js');
var to_array = require("./lib/to_array");
var events = require("events");
var util = require('util');
/*
  @params: redisServers -> json format servers config [{port:xx[,host:xx[,slots:"1,2,3~100,101,105-200,xx"]]},{port:xxx}]
*/
function createClient(redisServers) {
  if (!redisServers) {
    throw new Error('need init configs');
    return null;
  }
  if(arguments.length == 2){
    /*simple compatible for redis.CreateClient(port,host)*/
    redisServers = [{port:arguments[0],host:arguments[1]}];
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
    // client.on('error',function(msg){

    // })
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
  //install listener on each clients
  events.EventEmitter.call(this);
  return;
}
module.exports.clusterClient = clusterClient;
    
util.inherits(clusterClient, events.EventEmitter);

/*SHOULD LISTEN EVENTS on every client!*/
/*To act as redisClient*/
/*EVENTS :ready error drain end reconnecting idle message pmessage monitor connect*/
// clusterClient.prototype.install_listeners = function() {
//    var self  = this;
//   foreach(clients in clientmap) -> clients.on('xx',function(xx){self.emit('xx')})
//     });
// };




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
  //
  // process command and arguments and callback accroding to RedisClient.prototype.send_command
  //
  var key = args[0];
  // console.log('keys', key);
  /*typeof args[args.length - 1] == 'undefined' accroding to RedisClient.prototype.send_command*/
  if (!callback && (typeof args[args.length - 1] == 'function' || typeof args[args.length - 1] == 'undefined')) {
    callback = args.pop();
  }
  var client = this.slotsPool[crc16(key)];
  // console.log('current slot first use port', client.connectionOption.port);
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
      // console.log("ask using address", tmpClient.address);
      tmpClient.asking(function(error, reply) {
        if (error) {
          callback && callback(error, reply); //use this reply to retrun the outer callback;
          return;
        }
        // console.log('args', args);
        tmpClient[command](args, callback); //use outer callback
        return;
      });
    } else if (errType == 'MOVED') {
      /*update slots cache after MOVED*/
      self.slotsPool[dstSlot] = tmpClient;
      // console.log("moevd using address", tmpClient.address);
      // console.log('args', args);
      tmpClient[command](args, callback);
      return;
    } else {
      // console.log('no cluster err(MOVED/ASK)');
      callback && callback(err, reply);
      return;
    }
  });
}

/*Copy from node_redis*/
/*MULTI and EXEC will not support*/
clusterClient.prototype.HMGET = clusterClient.prototype.hmget = function(arg1, arg2, arg3) {
  if (Array.isArray(arg2) && typeof arg3 === "function") {
    return this.send_command("hmget", [arg1].concat(arg2), arg3);
  } else if (Array.isArray(arg1) && typeof arg2 === "function") {
    return this.send_command("hmget", arg1, arg2);
  } else {
    return this.send_command("hmget", to_array(arguments));
  }
};

clusterClient.prototype.HMSET = clusterClient.prototype.hmset = function(args, callback) {
  var tmp_args, tmp_keys, i, il, key;

  if (Array.isArray(args) && typeof callback === "function") {
    return this.send_command("hmset", args, callback);
  }

  args = to_array(arguments);
  if (typeof args[args.length - 1] === "function") {
    callback = args[args.length - 1];
    args.length -= 1;
  } else {
    callback = null;
  }

  if (args.length === 2 && (typeof args[0] === "string" || typeof args[0] === "number") && typeof args[1] === "object") {
    // User does: client.hmset(key, {key1: val1, key2: val2})
    // assuming key is a string, i.e. email address

    // if key is a number, i.e. timestamp, convert to string
    if (typeof args[0] === "number") {
      args[0] = args[0].toString();
    }

    tmp_args = [args[0]];
    tmp_keys = Object.keys(args[1]);
    for (i = 0, il = tmp_keys.length; i < il; i++) {
      key = tmp_keys[i];
      tmp_args.push(key);
      tmp_args.push(args[1][key]);
    }
    args = tmp_args;
  }

  return this.send_command("hmset", args, callback);
};

/*TODO*/
/*ADD 'EVAL' command*/

/*Imply asking if node_redis not imply*/
if (!Redis.RedisClient.prototype.asking) {
  Redis.RedisClient.prototype.asking = function(callback) {
    return this.send_command('asking', [], callback);
  };

  clusterClient.prototype.asking = function(callback) {
    return this.send_command('asking', [], callback);
  };
}