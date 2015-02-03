var parseSlots = require('./../lib/slot_parser.js')
var assert = require('assert')

assert.deepEqual([1,2,3,4,5],parseSlots('1-5'));
assert.deepEqual([1,2,3,4,5],parseSlots('1,2,3,4,5'));
assert.deepEqual([1,2,3,4,5],parseSlots('1,2,3-5'));
assert.deepEqual([1,2,3,4,5],parseSlots('1-2,3,4-5'));
assert.deepEqual([1,2,3,4,5],parseSlots('1-3,4,5'));

assert.equal(null,parseSlots());
assert.equal(null,parseSlots(undefined));
assert.equal(null,parseSlots(null));

