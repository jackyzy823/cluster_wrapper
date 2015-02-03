
module.exports.parseSlots = function _parseSlots(slots){
    if(!slots){
        return null;
    }
    var slotsArray=[];
    slots.split(',').forEach(function(item){
        var res = item.split('-');
        if(res.length == 1){
            slotsArray.push(parseInt(res))
        }
        else if(res.length == 2){
            for(var i = parseInt(res[0]),end = parseInt(res[1]);i <= end; i++) {
                slotsArray.push(i);
            }
        }
    });
    return slotsArray;
}
