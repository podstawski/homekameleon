
module.exports = function (db,condition) {
    var table=condition.db||'ios';
    
    if (typeof(db[table])=='undefined') return false;
    
    var data=db[table].get(condition);
    
    if (data==null) return false;
    var field=condition.condition[0];
    if (typeof(data[field])=='undefined') data[field]='';
    var comp = condition.condition[2];
    
    if (typeof(comp)=='string' && comp.substr(0,1)=='$') {
	var data2 = db[table].get(comp.substr(1));
	if (typeof(data2.value)!='undefined') comp=data2.value;
    }
    switch (condition.condition[1]) {
        case '=':
            return data[field] == comp;

        case '<>':
        case '!=':
            return data[field] != comp;
    
        case '>':
            return parseFloat(data[field]) > parseFloat(comp);

        case '<':
            return parseFloat(data[field]) < parseFloat(comp);
        
        case '>=':
            return parseFloat(data[field]) >= parseFloat(comp);

        case '<=':
            return parseFloat(data[field]) <= parseFloat(comp);

        default:
            return false;
    }
    
}
