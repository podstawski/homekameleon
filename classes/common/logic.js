var condition=require('./condition');
var checkactive=require('./checkactive');

var Logic = function(scenario,logger)
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
                    db.outputs.set(data);
                    break;
                
                case 'input': {
                    var inp=db.inputs.get(data);
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
                    db.inputs.set(data);
                
                    
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
                                    
                                    for (var j=0;j<actions.actions[i].scenarios.length; j++) {
                                        anypass=true;
                                        scenario.run(actions.actions[i].scenarios[j]);
                                    }
                                }
                                
                            }
                            if (!anypass) {
                                logger.log('No satisfying condition for input '+db.actions.index(data),'logic');
                            }
                        }
                    } else {
                        
                        var name='';
                        if (inp!=null) {
                            name=' ('+inp.name+')';
                        }
                        logger.log('No action for input '+db.actions.index(data)+name,'logic');
                    }
                    
                    
                    
                }
            }
        }
    }
    
}

module.exports=Logic;