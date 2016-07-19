var ArrayMath = require('../common/arraymath');

module.exports = function(com,ini,logger,callback) {

    var database,deviceId;
    
    var arrayMath = new ArrayMath();
    
    com.on('notify',function(type,data) {
        
        database.ios.get(data,function(data){
            if (data!=null && typeof(data.related)=='object') {
                for (var i=0; i<data.related.length; i++) {
                    database.ios.get(data.related[i],function(rec){
                        if (rec.device!=deviceId) return;
                        var values=[];
                        for (var i=0;i<rec.related.length;i++) {
                            values.push(database.ios.get(rec.related[i]).value);
                        }
                        rec.value=arrayMath.avg(values);
                        if(typeof(rec.value)=='number') rec.value=Math.round(100*rec.value)/100;
                        callback('output',rec);
                    });
                }
            }
        });
        
        
    });
        
    return {
        
        'set': function(data,delay) {
            if (delay==null) delay=0;
            if (data.delay==null) data.delay=0;
            delay+=data.delay;
            
            setTimeout(function(){
                database.ios.get(data,function(rec){
                    var related=rec.related||[];
                    for (var i=0; i<related.length; i++) {
                        database.ios.get(related[i],function(rec){
                            var set={
                                haddr: rec.haddr,
                                device: rec.device,
                                value: data.value
                            };
                            callback('set',set);
                        });
                    }
                });
            },delay*1000);
            
        },
        
        'data': function(data) {
            callback('output',{haddr:data.haddr,value:data.value});
        },
        
        'setId': function (id) {
            deviceId = id;
        },
        
        'initstate': function (db) {
            database=db;
        }
    }
    
}