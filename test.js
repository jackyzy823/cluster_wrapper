var Redis = require('redis')
var crc16 = require('./redis_crc.js')

// var client = Redis.createClient(30001);

// client_pool = [];
var clients_pool =[];
var clients_map = {}

for(var i = 0;i <25 ;i++){
	clients_pool.push(Redis.createClient(30001+i));
	clients_map["localhost"+ (30001+i)]=clients_pool[i];
}


var  pool = {};
for(var i =0;i<16384;i++){
	pool[i] = clients_pool[(Math.random()*100>>0)&25];
}
clients_pool = null;
module.exports = pool;


//
//
//