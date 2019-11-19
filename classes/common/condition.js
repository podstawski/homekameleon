
module.exports = function (db,condition) {
    var table=condition.db||'ios';
    
    if (typeof(db[table])=='undefined') return false;
    
    var data=db[table].get(condition);
    data.time=Date.now()-(data.last||0);
    
    if (data==null) return false;
    var field=condition.condition[0];
    if (typeof(data[field])=='undefined') data[field]='';
    var comp = condition.condition[2];
    
    if (typeof(comp)=='string' && comp.substr(0,1)=='$') {
	var data2 = db[table].get(comp.substr(1));
	if (typeof(data2.value)!='undefined') comp=data2.value;
    }
    if (typeof(comp)==='string' && comp.match(/^[0-9]+s$/))
	comp=parseFloat(comp.replace('s',''))*1000;
    if (typeof(comp)==='string' && comp.match(/^[0-9]+m$/))
	comp=parseFloat(comp.replace('m',''))*1000*60;
    if (typeof(comp)==='string' && comp.match(/^[0-9]+h$/))
	comp=parseFloat(comp.replace('h',''))*1000*60*60;
    var ret=false;
    switch (condition.condition[1]) {
        case '=':
            ret=data[field] == comp;
	    break;
        case '<>':
        case '!=':
            ret=data[field] != comp;
	    break;
        case '>':
            ret=parseFloat(data[field]) > parseFloat(comp);
	    break;
        case '<':
            ret=parseFloat(data[field]) < parseFloat(comp);
	    break;
        
        case '>=':
            ret=parseFloat(data[field]) >= parseFloat(comp);
	    break;

        case '<=':
            ret=parseFloat(data[field]) <= parseFloat(comp);
	    break;

        default:
            return false;
    }
    //console.log(condition.condition[0],data[field],condition.condition[1],comp,'=',ret,data.time,data.last,Date.now()-data.last);
    return ret;
}
