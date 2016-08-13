

module.exports = function(com,ini,logger,callback) {
    var database;
        
    return {
        'initstate': function (db) {
            database=db;
        },
 
        'set': function(data,delay,ctx) {
        },
        
        'data': function(data,ctx) {
            callback('output',{haddr:data.haddr,value:data.value},ctx);
        },
        
        'cancel': function(ctx,delay) {
           
        }
    }
    
}