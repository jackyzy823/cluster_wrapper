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

describe('redis cluster command test', function() {
  it('set/get', function(done) {
    redis.set('msg', '1234', function(err, reply) {
      assert.equal('OK', reply);
      redis.get('msg', function(err, reply) {
        assert.equal('1234', reply);
        done();
      });
    });
  });
  it('mset/mget', function(done) {
    redis.mset({
      'key1': 'value01',
      'key10': 'value91'
    }, function(err, reply) {
      assert.equal('OK', reply);
      redis.mget(['key1', 'key10'], function(err, reply) {
        assert.deepEqual(['value01', 'value91'], reply);
        done();
      });
    });
  });

});