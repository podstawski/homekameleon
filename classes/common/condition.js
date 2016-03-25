
module.exports = function (db,condition) {
    var table=condition.db;
    
    if (typeof(db[table])=='undefined') return false;
    var data=db[table].get(condition);
    var field=condition.condition[0];
    if (typeof(data[field])=='undefined') data[field]='';
    
    switch (condition.condition[1]) {
        case '=':
            return data[field]==condition.condition[2];

        case '<>':
        case '!=':
            return data[field]!=condition.condition[2];
    
        default:
            return false;
    }
    
}