var condition=require('./condition');
var checkactive=require('./checkactive');

var Logic = function(script,logger)
{
    var db;
    var collection;
    
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
    
    var evaluate = function (io) {
        var now=Date.now();
        
        if (io.last==null) io.last=0;
        io.time=now-io.last;


        if (io['eval'] == null || io['eval'].length==0){
            io.last=now; 
            return false;
        }
        
        for (var k in io) {
            if (k=='eval' || k=='io' || k=='e') continue;
            var e='var '+k+'=io.'+k+';'
            eval(e);
        }
        var e='value='+io['eval']+';';
        eval(e);
        io.value=value;
        io.last=now; 
        return true;
    }
    
    return {
        setdb: function (setdb,c) {
            db=setdb;
            collection=c;
        },
        
        action: function(device,type,data) {
            data.device=device;
            var io=db.ios.get(data);
            var io_cp=JSON.parse(JSON.stringify(io));
            
            switch (type) {
                case 'set':
                    if (io_cp.value!=data.value) script.set(io,data.value);
                    break;
                
                case 'script':
                    script.run(data.script);
                    break;
                
                case 'output':
                    data.eval=io.eval||null;
                    evaluate(data);
                    db.ios.set(data);
                    run_actions(data,false);
                    break;
                
                case 'input': {
                    if (data.device!==undefined) delete(data.device);
                    if (io==null) break;
                    if (!checkactive(io)) break; 
                    
                    data.eval=io.eval||null;
                    var evaluated=evaluate(data);
                    db.ios.set(data);
                    run_actions(data,!evaluated);
                    
                    break;
                    
                    
                }
            }
            
            if (io!=null && io.store!=null && io.store.length>0) {
                var store=io.store.split('/');
            
                if (!collection.inited(store[0])) {
                    collection.init(store[0],10,store[1]||60,function(){
                        collection.add(store[0],io.value);
                    });
                } else {
                    collection.add(store[0],io.value);
                }
            }
            
            return typeof(data.value)!='undefined' && io_cp.value!=data.value;
        }
    }
    
}

module.exports=Logic;