var json = require('./models/json');



module.exports = function(session) {
    
    var states = new json({
        file:'./data/states',
        index:['addr']
    },console);
    
    

    var allStates=function(socket) {
        states.select([{state:['>',0]}],null,function(data){
            var positive=data.data;
            if (socket==null) return;
            for (var i=0;i<positive.length; i++) {
                socket.emit('bus',positive[i].addr,positive[i].state);
            }             
        });
        
   
    }
    
    states.init(allStates);
        
    
    return {
        run: function(socket) {
    
            socket.on('bus',function(addr,state) {
                
                if (addr==null) {
                    allStates(socket);
                    return;
                }
                
                
                var a=addr.replace('I','O');
                
                var s=states.get(a);
                if (s==null) {
                    s={addr: a, state: (a==addr)?parseInt(state):0};
                    states.add(s);
                }
                
                
                var state2=s.state==0?1:0;    
                
                
                if (parseInt(state)>1) {
                    state2=parseInt(state);
                }
                
                if (addr.indexOf('IM')>=0) {
                    state2=parseInt(state);
                }
                
                states.set({state:state2},a,function(){
                    for (var h in session) {    
                        if (typeof(session[h].socket)!='undefined' && session[h].socket!=null ) {
                            session[h].socket.emit('bus',a,state2);
                        }
                    } 

                });
                
                
                
                
            })
        }
    }
}