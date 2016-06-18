var util = require('util');
var EventEmitter = require('events').EventEmitter;
var condition=require('./condition');
var levenshtein=require('./levenshtein');
var checkactive=require('./checkactive');

var Script=function(logger) {
    var self=this;
    var db;
    var cache={};
    
    var scriptsQueue=[];
    var scriptsSemaphore=false;
    
    var runscripts=function() {
        if (scriptsQueue.length==0) return;
        if (scriptsSemaphore) return;
        
        scriptsSemaphore=true;
        
        for (var i=0;i<scriptsQueue.length;i++) {
            if (scriptsQueue[i].when<=Date.now()) {
                
                var pass=true;
                
                if (typeof(scriptsQueue[i].script.conditions)=='object') {
                    for (var j=0; j<scriptsQueue[i].script.conditions.length; j++) {
                        pass*=condition(db,scriptsQueue[i].script.conditions[j]);
                        if (!pass) break;
                    }                    
                }
                
                if (pass) {
                    logger.log(scriptsQueue[i].script.name,scriptsQueue[i].script.log||'script');
                    

                    for(var j=0;j<scriptsQueue[i].script.actions.length;j++) {
                        
                        self.emit(scriptsQueue[i].script.actions[j].device,
                                  scriptsQueue[i].script.actions[j].device,
                                  scriptsQueue[i].script.actions[j]);
                    }
                } else if (typeof(scriptsQueue[i].script.nactions)=='object' && scriptsQueue[i].script.nactions.length) {
                    logger.log('!'+scriptsQueue[i].script.name,scriptsQueue[i].script.log||'script');
                
                
                    for(var j=0;j<scriptsQueue[i].script.nactions.length;j++) {
                        
                        self.emit(scriptsQueue[i].script.nactions[j].device,
                                  scriptsQueue[i].script.nactions[j].device,
                                  scriptsQueue[i].script.nactions[j]);
                    }
                }
                
                scriptsQueue.splice(i,1);
                scriptsSemaphore=false;
                setTimeout(runscripts,1);
                return;
            }
        }
        
        scriptsSemaphore=false;
        setTimeout(runscripts,1000);
    }
    
    var run = function(script,delay) {
        if (delay==null) delay=0;
        
        /*
         *check if script is object and has delay defined
         */
        if (typeof(script)=='object' && typeof(script.script)=='string') {
            if (typeof(script.delay)!='undefined') {
                delay+=parseFloat(script.delay);
            }
            script=script.script;
        }
        
        /*
         *get database for specified script id
         */
        script=db.scripts.get(script);
        if (script==null) return;
        if (!checkactive(script)) return;
    
        /*
         *queue script
         */
        var when=Date.now()+1000*delay;
        
        scriptsQueue.push({
            when: when,
            script: script
        });
        
        /*
         *run queue
         */
        runscripts();
        
        /*
         *run subscripts
         */
        if (typeof(script.scripts)=='object' ) {
            for (var i=0;i<script.scripts.length;i++) {
                run(script.scripts[i],delay)
            }
        }
        
    } 
    
    var find=function(str) {
        if (typeof(cache[str])!='undefined') return cache[str];
        
        var s=db.scripts.get(str);
        if (s!=null) {
            cache[str]=s.id;
            return s.id;
        }
        
        var all=db.scripts.getAll().data;
        
        str=str.toLowerCase();
        
        var result={};
        for (var id in all) {
            if ( all[id].name==null) continue;
            var lev=levenshtein(str,all[id].name.toLowerCase());
            if (lev==0) return id;
            if (lev>5) continue;
            if (typeof(result[lev])=='undefined') result[lev]=[];
            result[lev].push(all[id]);
        }
        
        if (typeof(result[1])!='undefined') {
            cache[str]=result[1][0].id;
            return cache[str];
        }
        
        if (typeof(result[2])!='undefined') {
            cache[str]=result[2][0].id;
            return cache[str];
        }
        

        var results=[{},{}];
        for (var i=3; i<=5; i++) {
            
            if (typeof(result[i])=='undefined') continue;
            for (j=0;j<result[i].length;j++) {
                lev1=levenshtein(str+' on',result[i][j].name.toLowerCase());
                lev2=levenshtein(str+' off',result[i][j].name.toLowerCase());
            
                if (typeof(results[0][lev1])=='undefined') results[0][lev1]=[];
                results[0][lev1].push(result[i][j]);
                if (typeof(results[1][lev2])=='undefined') results[1][lev2]=[];
                results[1][lev2].push(result[i][j]);
            
                lev1=levenshtein(str+' start',result[i][j].name.toLowerCase());
                lev2=levenshtein(str+' stop',result[i][j].name.toLowerCase());
            
                if (typeof(results[0][lev1])=='undefined') results[0][lev1]=[];
                results[0][lev1].push(result[i][j]);
                if (typeof(results[1][lev2])=='undefined') results[1][lev2]=[];
                results[1][lev2].push(result[i][j]);            
            
            }
        }
        var res=['',''];
        
        for (var i=0; i<2; i++) {
            for (var j=0; j<=2; j++) {
                if (typeof(results[i][j])!='undefined') {
                    res[i]=results[i][j][0].id;
                    break;
                }
            }
        }
        
        if (res[0].length>0 && res[1].length) {
            cache[str]=res;
            return res;
        }
        return null;
    }
    
    
    return {
        setdb: function(setdb) {
            db=setdb;
        },
        
        on: function(event,fun) {
            self.on(event,fun);
        },
        
        run: function(script,delay) {
            run(script,delay);
        },
        
        find: function(str) {
            return find(str);
        },
        
        set: function(io,value) {
            var set={haddr:io.haddr, value:value};
            self.emit(io.device,io.device,set);
        }
    }
    
}

util.inherits(Script, EventEmitter);

module.exports=Script;