cluster_wrapper - a node.js redis cluster wrapper for node_redis
============================


##Usage
```js
var config = [{port:30001, slots:'0~3276'},{port:30002, slots:'3277~6553'},{port:30003, slots:'6554~9829'},{port:30004, slots:'9830~13106'},{port:30005, slots:'13106~16383'} ]
var cluster = require('cluster_wrapper');
var redis = cluster.createClient(config);

redis.set('msg','1234',function(err,reply){
  redis.get('msg',function(err,reply){
    console.log(reply)
  });
});
```
Works the same as [node_redis](https://github.com/mranney/node_redis),Handling 'MOVED'/'ASK' internal in this lib.

##Feature
 * support MGET/MSET (Except MSETNX)


##Note
This repo is under construction and 'cause redis 3.0 is unstable,so this repo is unstable too.
