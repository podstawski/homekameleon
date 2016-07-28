

module.exports = function(com,ini,logger,callback) {

    var timers={};
        
    return {
        
        'set': function(data,delay,ctx) {
            if (delay==null) delay=0;
            if (delay==0) com.send(data,ctx);
            else {
                
                while (true) {
                    var id=Math.random();
                    if (timers[id]==null) break;
                }
                var timer=setTimeout(function(id){
                    delete(timers[id]);
                    com.send(data,ctx);
                },1000*delay,id);
                timers[id]={timer:timer,ctx:ctx};
            }
        },
        
        'data': function(data,ctx) {
            callback('output',{haddr:data.haddr,value:data.value},ctx);
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