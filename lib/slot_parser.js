/*
@params: slots ->String or any other can be converted to string.
@usage: _parseSlots('1,2,3,4~100')
@note: will ignore malformed
*/
module.exports = function _parseSlots(slots) {
  if (!slots && slots != 0) {
    return null;
  }
  slots = slots.toString(); //force convert to string
  var slotsArray = new Array();
  slots.split(',').forEach(function(item) {
    var res = item.split('~');
    if (res.length == 1) {
      var parsedRes = parseInt(res);
      if (isNaN(parsedRes) || parsedRes < 0 || parsedRes > 16383) {
        return;
      }
      slotsArray.push(parseInt(parsedRes));
    } else if (res.length == 2) {
      var start = parseInt(res[0]) < 0 ? 0 : parseInt(res[0]);
      var end = parseInt(res[1]) > 16383 ? 16383 : parseInt(res[1]);

      if (isNaN(start) || isNaN(end)) {
        return;
      }
      start = start < 0 ? 0 : start;
      end = end > 16383 ? 16383 : end;
      if (start > end) {
        return;
      }

      for (var i = start; i <= end; i++) {
        slotsArray.push(i);
      }
    }
  });
  return slotsArray.length == 0 ? null : slotsArray;
}