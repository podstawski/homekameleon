

module.exports = function(com,ini,logger,callback) {

        
    return {
        
        'set': function(data,delay) {
            if (delay==null) delay=0;
            setTimeout(com.send,1000*delay,data);
        },
        
        'data': function(data) {
            callback('output',{haddr:data.haddr,value:data.value});
        }
    }
    
}