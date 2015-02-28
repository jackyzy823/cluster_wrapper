var parseSlots = require('./../lib/slot_parser.js')
var assert = require('assert')
  // require('should');
describe('slot_parser should work properly', function() {
  it('regular test', function() {
    assert.deepEqual([1, 2, 3, 4, 5], parseSlots('1~5'));
    assert.deepEqual([1, 2, 3, 4, 5], parseSlots('1,2,3,4,5'));
    assert.deepEqual([1, 2, 3, 4, 5], parseSlots('1,2,3~5'));
    assert.deepEqual([1, 2, 3, 4, 5], parseSlots('1~2,3,4~5'));
    assert.deepEqual([1, 2, 3, 4, 5], parseSlots('1~3,4,5'));
  });
  it('partly test', function() {
    assert.deepEqual([1, 2, 3, 4, 5], parseSlots('?,1,2,3~5'));
    assert.deepEqual([1, 2, 5, 4, 3], parseSlots('?,1,2,?~?,5,4,3'));
    assert.deepEqual([1, 2], parseSlots('?,1,2,?~5'));
    assert.deepEqual([1, 2, 3, 16381], parseSlots('1,~1,2,3,16381'));
    assert.deepEqual([16382, 16383], parseSlots('16382~16384'));
    assert.deepEqual([0, 1, 2], parseSlots('-2~2')); //oops neg number! 1. use ~ replace - 2.improve code
    assert.deepEqual([0, 1, 2, 16382, 16383], parseSlots('-2~2,16382~16384'));
  });
  it('malformed test', function() {
    assert.equal(null, parseSlots(',~,~,'));
    assert.equal(null, parseSlots(',,,'));
    assert.equal(null, parseSlots('~~~'));
    assert.equal(null, parseSlots('16384,16385'));
    assert.equal(null, parseSlots('~1,~2'));
  });
  it('number input', function() {
    assert.deepEqual([16383], parseSlots(16383));
    assert.equal(null, parseSlots(-1));
    assert.equal(null, parseSlots(16384));
    assert.deepEqual([1], parseSlots(1));
    assert.deepEqual([0], parseSlots(0));

  });
  it('undefined input', function() {
    assert.equal(null, parseSlots());
    assert.equal(null, parseSlots(undefined));
    assert.equal(null, parseSlots(null));
  });

});