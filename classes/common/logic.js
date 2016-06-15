var condition=require('./condition');
var checkactive=require('./checkactive');

var Logic = function(script,logger)
{
    var db;
    
    return {
        setdb: function (setdb) {
            db=setdb;        
        },
        
        action: function(device,type,data) {
            data.device=device;
            
            switch (type) {
                case 'output':        
                    db.ios.set(data);
                    break;
                
                case 'input': {
                    
                    var inp=db.ios.get(data);
                    if (inp==null) break;
                    if (!checkactive(inp)) break; 
                    
                    var actions=db.actions.get(data);
                    
                    var now=Date.now();
                    
                    if (typeof(inp.last)=='undefined') {
                        inp.last=0;
                    }
                    data.last=inp.last
                    data.time=now-data.last;
                    data.last=now;
                    db.ios.set(data);
                
                    
                    if (actions!=null) {
                        if (typeof(actions.actions)=='object') {
                            
                            var anypass=false;
                            for (var i=0; i<actions.actions.length; i++) {
                                var pass=true;
                                for (var j=0; j<actions.actions[i].conditions.length; j++) {
                                    pass*=condition(db,actions.actions[i].conditions[j]);
                                    if (!pass) break;
                                }
                                
                                if (pass) {
                                    
                                    for (var j=0;j<actions.actions[i].scripts.length; j++) {
                                        anypass=true;
                                        script.run(actions.actions[i].scripts[j]);
                                    }
                                }
                                
                            }
                            if (!anypass) {
                                logger.log('No satisfying condition for io '+db.actions.index(data),'logic');
                            }
                        }
                    } else {
                        
                        var name='';
                        if (inp!=null) {
                            name=' ('+inp.name+')';
                        }
                        logger.log('No action for io '+db.actions.index(data)+name,'logic');
                    }
                    
                    
                    
                }
            }
        }
    }
    
}

module.exports=Logic;