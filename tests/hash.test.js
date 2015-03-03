var assert = require('assert')
var slotHash = require('./../lib/slot_hash.js')



describe('slot hash should return right crc value', function() {
  it('regular hash', function() {
    assert.equal(2022, slotHash('date'));
    assert.equal(0x31C3, slotHash('123456789'));
    assert.equal(6257, slotHash('msg'));
    assert.equal(5798, slotHash('name'));
    assert.equal(14943, slotHash('fruits'));
  });
  it('hash tags', function() {
    assert.equal(slotHash('{123}.testa'), slotHash('{123}.testb'));
    assert.notEqual(slotHash('{123.45}'),slotHash('{123.56}'));
    assert.equal(slotHash('{123'),slotHash('{123'));
    assert.equal(slotHash('{123}'),slotHash('123'));  //key -> 123
    assert.notEqual(slotHash('123}'),slotHash('{123')); 
    assert.equal(slotHash('{123}{'),slotHash('{123}}')); //key -> 123
    assert.equal(slotHash('{{123}}222'),slotHash('{{123}111')); //key -> {123
  });
});
