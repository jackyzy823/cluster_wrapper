var utils = require('./../utils.js')
var assert = require('assert')

assert.deepEqual([1,2,3,4,5],utils.parseSlots('1-5'));
assert.deepEqual([1,2,3,4,5],utils.parseSlots('1,2,3,4,5'));
assert.deepEqual([1,2,3,4,5],utils.parseSlots('1,2,3-5'));
assert.deepEqual([1,2,3,4,5],utils.parseSlots('1-2,3,4-5'));
assert.deepEqual([1,2,3,4,5],utils.parseSlots('1-3,4,5'));

assert.equal(null,utils.parseSlots());
assert.equal(null,utils.parseSlots(undefined));
assert.equal(null,utils.parseSlots(null));

