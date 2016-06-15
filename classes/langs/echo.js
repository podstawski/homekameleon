

module.exports = function(com,ini,logger,callback) {

        
    return {
        
        'set': function(data) {
            com.send(data);            
        },
        
        'data': function(data) {
            callback('output',{haddr:data.haddr,value:data.value});
        }
    }
    
}