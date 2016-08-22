

module.exports = function(com,ini,logger,callback) {
    var database;
    var timers={};
        
    return {
        'initstate': function (db) {
            database=db;
        },
 
        'set': function(data,delay,ctx) {
            if (delay==null) delay=0;
            if (typeof(data.value)=='undefined') { //toggle
                var rec=database.ios.get(data);
                if (parseFloat(rec.value)>0 && parseFloat(rec.value)<=1) data.value=0;
                else if (parseFloat(rec.value)==0) data.value=1;
                else data.value=parseFloat(rec.value)
        
            }
            
            data.ctx=ctx;
            
            if (delay==0) com.send(data);
            else {
                
                while (true) {
                    var id=Math.random();
                    if (timers[id]==null) break;
                }
                var timer=setTimeout(function(id){
                    delete(timers[id]);
                    com.send(data);
                },1000*delay,id);
                timers[id]={timer:timer,ctx:ctx};
            }
        },
        
        'data': function(data) {
            callback('output',{haddr:data.haddr,value:data.value},data.ctx);
        },
        
        'cancel': function(ctx,delay) {
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