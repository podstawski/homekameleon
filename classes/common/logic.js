var condition=require('./condition');
var checkactive=require('./checkactive');

var Logic = function(script,logger)
{
    var db;
    
    var run_actions = function(data,dbg_output) {
        var actions=db.actions.get(data);

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
                    if(dbg_output) logger.log('No satisfying condition for io '+db.actions.index(data),'logic');
                }
            }
        } else {
            
            var name='';
            io=db.ios.get(data);
            if (io!=null) {
                name=' ('+io.name+')';
            }
            if(dbg_output) logger.log('No action for io '+db.actions.index(data)+name,'logic');
        }
        
        
    }
    
    return {
        setdb: function (setdb) {
            db=setdb;        
        },
        
        action: function(device,type,data) {
            data.device=device;
            
            switch (type) {
                
                case 'set':
                    var io=db.ios.get(data);
                    script.set(io,data.value);
                    break;
                
                case 'script':
                    script.run(data.script);
                    break;
                
                case 'output':        
                    db.ios.set(data);
                    run_actions(data,false);
                    break;
                
                case 'input': {
                    var inp=db.ios.get(data);
                    if (inp==null) break;
                    if (!checkactive(inp)) break; 
                    
                    
                    var now=Date.now();
                    
                    if (typeof(inp.last)=='undefined') {
                        inp.last=0;
                    }
                    data.last=inp.last
                    data.time=now-data.last;
                    data.last=now;
                    db.ios.set(data);
                
                    run_actions(data,true);
                    
                    break;
                    
                    
                }
            }
        }
    }
    
}

module.exports=Logic;