var condition=require('./condition');
var checkactive=require('./checkactive');
var Levenshtein=require('./levenshtein');

var Logic = function(script,logger)
{
    var db;
    var collection;
    var ini;
    
    var scrlev,ioslev;
 
    
    var run_actions = function(data,dbg_output,ctx) {
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
                            script.run(actions.actions[i].scripts[j],0,null,ctx);
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
        
        io.time=now-(io.last||0);

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
        //console.log(e,value,io);
        io.value=value;
        io.last=now; 
        return true;
    }
    
    return {
        setdb: function (setdb,c,setini) {
            db=setdb;
            collection=c;
            scrlev=script.finder;
            ini=setini;
            ioslev=new Levenshtein(db.ios,'name',ini.dictionary.synonyms||{});
        },
        
        action: function(device,type,data,ctx) {
            data.device=device;
            var io=db.ios.get(data);
            var io_cp=JSON.parse(JSON.stringify(io));
            

            switch (type) {
                
                case 'command':
                    var s=script.find(data.q);
                    if (typeof(s)=='number') {
                        script.run(s);
                        db.scripts.get(s,function(s){
                            data.cb(ini.dictionary.dict.done+': '+s.name);
                        });
                        break;
                    } else {
                        var result='';
                        var ios=ioslev.find(data.q);
                        if (ios) for(var i=0; i<ios.length; i++){
                            if (ios[i].rec.unit) {
                                result+=ios[i].rec.name+' '+(Math.round(10*ios[i].rec.value)/10)+' '+ios[i].rec.unit+'. ';
                            }
                        }
                        if(result.length>0) {
                            data.cb(result);
                            break;
                        }
                        
                    }
                    data.cb(ini.dictionary.dict.command_not_found);
                    
                    break;
                
                case 'set':
                    if (io==null) return;
                    if (io_cp.value!=data.value) script.set(io,data.value,ctx);
                    break;
                
                case 'script':
                    script.run(data.script,null,null,ctx);
                    break;
                
                case 'output':
                    if (io==null) return;
                    data.last=io.last||0;
                    data.eval=io.eval||null;
                    evaluate(data);
                    db.ios.set(data);
                    run_actions(data,false,ctx);
                    break;
                
                case 'input':
                    if (io==null) return;
                    if (data.device!==undefined) delete(data.device);
                    if (io==null) break;
                    if (!checkactive(io)) break; 
                    
                    data.last=io.last||0;
                    data.eval=io.eval||null;
                    var evaluated=evaluate(data);
                    db.ios.set(data);
                    run_actions(data,!evaluated,ctx);
                    
                    break;
                    
                    
                
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