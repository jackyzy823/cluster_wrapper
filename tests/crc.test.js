var assert = require('assert')
var crc16 = require('./../redis_crc.js')

assert.equal(2022,crc16('date'));
assert.equal(0x31C3,crc16('123456789'));
assert.equal(6257,crc16('msg'));
assert.equal(5798,crc16('name'));
assert.equal(14943,crc16('fruits'));

