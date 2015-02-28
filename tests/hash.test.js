var assert = require('assert')
var slotHash = require('./../lib/slot_hash.js')

assert.equal(2022, slotHash('date'));
assert.equal(0x31C3, slotHash('123456789'));
assert.equal(6257, slotHash('msg'));
assert.equal(5798, slotHash('name'));
assert.equal(14943, slotHash('fruits'));

assert.equal(slotHash('{123}.testa'), slotHash('{123}.testb'));