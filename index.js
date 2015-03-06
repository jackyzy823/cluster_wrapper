var Redis = require('redis');
var slotHash = require('./lib/slot_hash.js');
var parseSlots = require('./lib/slot_parser.js');
var to_array = require("./lib/to_array");
var events = require("events");
var util = require('util');
var async = require('async');
/*
  @params: redisServers -> json format servers config [{port:xx[,host:xx[,slots:"1,2,3~100,101,105-200,xx"]]},{port:xxx}]
*/
function createClient(redisServers) {
  if (!redisServers) {
    throw new Error('need init configs');
    return null;
  }
  /*simple compatible for redis.CreateClient(port,host,options)*/
  /*current not support socket*/
  if (arguments.length == 1 && typeof arguments[0] == 'number') {
    redisServers = [{
      port: arguments[0]
    }]
  } else if (arguments.length == 2) {
    if (typeof arguments[1] == 'object') {
      redisServers = [{
        port: arguments[0],
        options: arguments[1]
      }];
    } else {
      redisServers = [{
        port: arguments[0],
        host: arguments[1]
      }];
    }
  } else if (arguments.length == 3) {
    redisServers = [{
      port: arguments[0],
      host: arguments[1],
      options: arguments[2]
    }];
  }

  Array.isArray(redisServers) || (redisServers = [redisServers]);
  var clientsMap = {};
  var slotsPool = new Array(16384); //0->16383
  /*Initialize pool */
  var client = null;
  redisServers.forEach(function(server) {
    var host = server.host || '127.0.0.1';
    if (!server.port || typeof server.port != 'number' || server.port % 1 !== 0 || server.port > 65536 || server.port < 0) {
      console.log(server);
      throw new Error('port should be defined or 0~65535 integer!');
    }
    var port = server.port;
    var options = server.options || null;
    var slots = parseSlots(server.slots);
    /*TODO*/
    /*client should be compatible with node_redis */
    /*What if cluster is offline after init?*/
    /*Not described in redis cluster spec*/
    client = Redis.createClient(port, host, options);
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
  /*
  clientsMap client.address -> redisClient.Object
  slotsPool slotsNumber - > client.address[now]
             slotsNumber -> redisClient.Object [prev]
      so which one use less memeory? may be Object -> so revert to prev version
  */


  return new clusterClient(clientsMap, slotsPool);
}

module.exports.createClient = createClient;

function clusterClient(clientsMap, slotsPool) {
  this.clientsMap = clientsMap;
  this.slotsPool = slotsPool;
  //install listener on each clients
  this.install_listeners();
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

clusterClient.prototype.install_listeners = function(){
  var self = this;
  for (var clientAddr in this.clientsMap) {
    var client = this.clientsMap[clientAddr];
    client.on('error', function(msg) {
      self.emit('error', msg, clientAddr); // emit error msg with "client address info"
    });
    client.on('ready', function() {
      self.emit('ready', clientAddr);
    });
    client.on('drain', function() {
      self.emit('drain', clientAddr);
    });
    client.on('end', function() {
      //may do more in here ,cause one client  gone,the cluster wont work.
      self.emit('end', clientAddr);
    });
    client.on('reconnecting', function(msg) {
      self.emit('reconnecting', msg, clientAddr);
    });
    client.on('idle', function() {
      self.emit('idle', clientAddr);
    });
    client.on('message', function(channel, msg) {
      self.emit('message', channel, msg, clientAddr);
    });
    client.on('pmessage', function(pattern, channel, msg) {
      self.emit('pmessage', pattern, channel, msg, clientAddr);
    });
    client.on('monitor', function(timestamp, args) {
      self.emit('monitor', timestamp, args, clientAddr);
    });
    client.on('connect', function() {
      self.emit('connect', clientAddr);
    });
  }
}

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
  if (['info', 'multi', 'exec', 'slaveof', 'config', 'shutdown', 'select'].indexOf(command) != -1) {
    clusterClient.prototype[command] = function(args, callback) {
      /*should just throw error instead of return err in callback?*/
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

  // for now 
  // in mget all args are keys ,but they have same crc value
  // in mset all even(0,2,4...) args are keys , and they have same crc value
  var key = args[0];
  // console.log('keys', key);
  /*typeof args[args.length - 1] == 'undefined' accroding to RedisClient.prototype.send_command*/
  if (!callback && (typeof args[args.length - 1] == 'function' || typeof args[args.length - 1] == 'undefined')) {
    callback = args.pop();
  }
  var client = this.slotsPool[slotHash(key)];
  // console.log('current slot first use port', client.connectionOption.port);
  // client[command]
  client.send_command(command, args, function wrapCallback(err, reply) {
    var tmpClient = null;

    var errType = null;
    var errMsg = null;
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


/*mset usage mset({key1:value1,key2:value2},callback)  
          or mset([key1,value1,key2,value2],callback)
          or mset(key1,value1,key2,value2,...,callback)
*/
clusterClient.prototype.MSET = clusterClient.prototype.mset = function(args, callback) {
    if (!(Array.isArray(args) && typeof callback === "function")) {
      args = to_array(arguments);
      if (typeof args[args.length - 1] === 'function') {
        callback = args.pop();
      } else {
        callback = null;
      }
      if (args.length == 1) {
        if (Array.isArray(args[0])) {
          args = args[0];
        } else if (typeof args[0] === 'object') {
          var k;
          var tmp = [];
          for (var t = Object.keys(args[0]), len = t.length, i = 0; i < len; i++) {
            k = t[i];
            tmp.push(k);
            tmp.push(args[0][k]);
          }
          // var t = Object.keys(args[0]).map(function(k){tmp.push(k);tmp.push(args[0]][k]);});
          args = tmp;
        } else {
          throw new Error('args type not support');
        }
      } else if (!!(args.length & 1)) {
        throw new Error('args key-value should be even');
      }
    }
    //now args and callback done;
    var usedSlots = {};
    var crcVal;
    for (var i = 0, len = args.length; i < len; i += 2) {
      crcVal = slotHash(args[i]);
      if (usedSlots[crcVal] === undefined) {
        usedSlots[crcVal] = [args[i], args[i + 1]];
      } else {
        usedSlots[crcVal].push(args[i], args[i + 1]);
      }
    };
    var self = this;
    async.map(Object.keys(usedSlots), function(slot, cb) {
      self.send_command('mset', usedSlots[slot], function(err, reply) {
        cb && cb(err, reply);
        return;
      });
    }, function(err, results) {
      if (err) {
        callback && callback(err, null);
        return;
      }
      //results like ['OK','OK','OK']
      // so just return 1 ok;
      callback && callback(null, results[0]);
    });

  }
  /*
   * mget usage mget([key1,key2,key3],callback)
   *         or mget(key1,key2,key3,callback)
   *      returns err,resultArray
   * */
clusterClient.prototype.MGET = clusterClient.prototype.mget = function(args, callback) {
  /* the judgement may be broken? */
  if (!(Array.isArray(args) && typeof callback === "function")) {
    args = to_array(arguments);
    if (typeof args[args.length - 1] === "function") {
      callback = args.pop();
    } else {
      callback = null;
    }
  }
  var self = this;
  // {slot0:{key:[srcIndex,srcIndex]}} 
  //        may duplicated keys so index in  array
  var usedSlots = {};
  var crcVal;
  args.forEach(
    function(key, index) {
      crcVal = slotHash(key);
      if (usedSlots[crcVal] === undefined) {
        usedSlots[crcVal] = {};
      }
      if (usedSlots[crcVal][key] === undefined) {
        usedSlots[crcVal][key] = [index];
      } else {
        usedSlots[crcVal][key].push(index);
      }
    }
  );

  var slotKeys = Object.keys(usedSlots);
  /* each iteration contains keys in same slot to avoid crosssolt error!!*/
  async.map(slotKeys, function(slot, cb) {
    /* cluset.send_command will handle MOVED for slots*/
    var keys = Object.keys(usedSlots[slot]);
    self.send_command('mget', keys, function(err, reply) {
      var res = {};
      reply.forEach(function(item, index) {
        res[keys[index]] = item;
      })
      cb && cb(err, res);
      return;
    });
  }, function(err, results) {
    if (err) {
      callback && callback(err, null);
      return;
    }
    /* FIXED: attention current order is not guarantee!  */
    /*                    slot0                 slot1    */
    /* results -> [{key1:value1,key2:value2},{key3:null}]*/
    var realResult = [];
    results.forEach(function(item, index) {
      var curSlot = usedSlots[slotKeys[index]];
      Object.keys(item).forEach(function(key) {
        curSlot[key].forEach(function(i) {
          realResult[i] = item[key];
        });
      });
    });


    callback && callback(null, realResult);
  });
}

clusterClient.prototype.DEL = clusterClient.prototype.del = function(args, callback) {
  if (!(Array.isArray(args) && typeof callback === "function")) {
    args = to_array(arguments);
    if (typeof args[args.length - 1] === "function") {
      callback = args.pop();
    } else {
      callback = null;
    }
  }
  var self = this;

  var usedSlots = {};
  var crcVal;
  args.forEach(
    function(key) {
      crcVal = slotHash(key);
      if (usedSlots[crcVal] === undefined) {
        usedSlots[crcVal] = [key];
      } else {
        usedSlots[crcVal].concat(key);
      }
    }
  );


  /* each iteration contains keys in same slot to avoid crosssolt error!!*/
  async.map(Object.keys(usedSlots), function(slot, cb) {
    self.send_command('del', usedSlots[slot], function(err, reply) {
      cb && cb(err, reply);
      return;
    });
  }, function(err, results) {
    if (err) {
      callback && callback(err, null);
      return;
    }
    var realResult = results.reduce(function(pre, cur) {
      return pre + cur;
    }, 0);

    callback && callback(null, realResult);
  });
}

clusterClient.prototype.MSETNX = clusterClient.prototype.msetnx = function(args, callback) {
  throw new Error("because of atomic ,this command will never implement .");
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