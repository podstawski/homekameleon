var ArrayMath = require('../common/arraymath');

module.exports = function(com,ini,logger,callback) {

    var database,deviceId;
    var arrayMath = new ArrayMath();
    var timers={};
    
    var calculateRelated = function(data,arrayOfCalled) {
        if (data!=null && typeof(data.related)=='object' && data.related!=null) {
            if (arrayOfCalled.indexOf(data.haddr)>=0) return;
            arrayOfCalled.push(data.haddr);
            
            for (var i=0; i<data.related.length; i++) {
                database.ios.get(data.related[i],function(rec){
                    if (rec.device!=deviceId) return;
                    
                    var values=[];
                    for (var i=0;i<rec.related.length;i++) {
                        var rel=database.ios.get(rec.related[i]);
                        
                        if (rel.device==deviceId && parseInt(rel.address) < parseInt(rec.address) ) {
                            calculateRelated(rec,arrayOfCalled); 
                        } else
                            values.push(rel.value);
                        
                    }
                    rec.value=arrayMath.avg(values);
                    if(typeof(rec.value)=='number') rec.value=Math.round(100*rec.value)/100;
                    callback('output',rec);
                });
            }
        }
        
    }
    
    
    com.on('notify',function(type,data) {
        
        database.ios.get(data,function(data){
            calculateRelated(data,[]);
        });
        
        
    });
        
    return {
        
        'set': function(data,delay,ctx) {
            if (delay==null) delay=0;
            if (data.delay==null) data.delay=0;
            delay+=data.delay;
            
            while (true) {
                var id=Math.random();
                if (timers[id]==null) break;
            }
            
            var timer=setTimeout(function(timerid){
                if (timers[timerid]!=null) delete(timers[timerid]);
                
                database.ios.get(data,function(rec){
                    var related=rec.related||[];
                    for (var i=0; i<related.length; i++) {
                        database.ios.get(related[i],function(rec2){
                            if (rec2.device==deviceId && parseInt(rec2.address)<parseInt(rec.address) ) return; 
                            
                            
                            var set={
                                haddr: rec2.haddr,
                                device: rec2.device,
                                value: data.value
                            };
                    
                            callback('set',set,ctx);
                        });
                    }
                });
            },delay*1000,id);
            
            if (delay>0) timers[id]={timer:timer,ctx:ctx};
        },
        
        'data': function(data,ctx) {
            callback('output',{haddr:data.haddr,value:data.value},ctx);
        },
        
        'setId': function (id) {
            deviceId = id;
        },
        
        'initstate': function (db) {
            database=db;
        },
        
        'cancel': function (ctx,delay) {
            setTimeout(function(){
                for (k in timers) {
                    if (timers[k].ctx==ctx) {
                        clearTimeout(timers[k].timer);
                        delete(timers[k]);
                    }
                }
            },delay*1000);
        }
    }
    
}
