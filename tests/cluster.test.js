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
      'key10': 'value91',
      'key5': 'value2',
      'key10086': 'value_123'
    }, function(err, reply) {
      assert.equal('OK', reply);
      redis.mget(['key1', 'key10', 'key5', 'key6'], function(err, reply) {
        assert.deepEqual(['value01', 'value91', 'value2', null], reply);
        done();
      });
    });
  });
  it('del', function(done) {
    redis.del('dk', function(err, reply) {
      assert.equal(0, reply);
      done();
    });
  });
  it('msetnx should raise err', function() {
    assert.throws(function() {
      redis.msetnx('whatever');
    }, /atomic/);
  });
  it('info should raise err', function(done) {
    redis.info(function(err, reply) {
      assert.ok(err instanceof Error);
      done();
    });
  });
  it('multi should raise err', function(done) {
    redis.multi(function(err, reply) {
      assert.ok(err instanceof Error);
      done();
    });
  });
  it('exec should raise err', function(done) {
    redis.exec(function(err, reply) {
      assert.ok(err instanceof Error);
      done();
    });
  });
  it('slaveof should raise err', function(done) {
    redis.slaveof(function(err, reply) {
      assert.ok(err instanceof Error);
      done();
    });
  });
  it('config should raise err', function(done) {
    redis.config(function(err, reply) {
      assert.ok(err instanceof Error);
      done();
    });
  });
  it('shutdown should raise err', function(done) {
    redis.shutdown(function(err, reply) {
      assert.ok(err instanceof Error);
      done();
    });
  });
  it('select should raise err', function(done) {
    redis.select(function(err, reply) {
      assert.ok(err instanceof Error);
      done();
    });


  });
});