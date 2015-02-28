var assert = require('assert');
var config = [{
    port: 30001,
    slots: '0~3276'
}, {
    port: 30002,
    slots: '3277~6553'
}, {
    port: 30003,
    slots: '6554~9829'
}, {
    port: 30004,
    slots: '9830~13106'
}, {
    port: 30005,
    slots: '13106~16383'
}]
var cluster = require('./../index.js');
var redis = cluster.createClient(config);

redis.set('msg', '1234', function(err, reply) {
    redis.get('msg', function(err, reply) {
        console.log(reply);
        return;
    });
});

redis.mset({
    'key1': 'value1',
    'key10': 'value2'
}, function(err, reply) {
    console.log('mset', err, 'res', reply);
    redis.mget(['key1', 'key10'], function(err, reply) {
        console.log('mget', err, 'res', reply);
        return
    });
});


/*Test not supported command:info ,multi,exec ...etc*/