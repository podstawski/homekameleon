var states={};

var allStates=function(socket) {
    for (var k in states) {
        if (states[k]>0) socket.emit('bus',k,states[k]);
    }    
}

module.exports = function(socket,session) {

    socket.on('bus',function(addr,state) {
        
        if (addr==null) {
            allStates(socket);
            return;
        }
        
        
        var a=addr.replace('I','O');
        
        
        if (states[a]===undefined) {
            if (a==addr) {
                states[a]=parseInt(state);
            } else {
                states[a]=0;
            }
        }
        
        
        var state2=states[a]==0?1:0;    
        
        
        if (parseInt(state)>1) {
            state2=parseInt(state);
        }
        
        if (addr.indexOf('IM')>=0) {
            state2=parseInt(state);
        }
        
        
        states[a]=state2;

        
        for (var h in session) {    
            if (typeof(session[h].socket)!='undefined' && session[h].socket!=null ) {
                session[h].socket.emit('bus',a,state2);
            }
        } 
        
        
        
    });
}