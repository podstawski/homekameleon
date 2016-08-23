var util = require('util');
var EventEmitter = require('events').EventEmitter;
var condition=require('./condition');
var Levenshtein=require('./levenshtein');
var checkactive=require('./checkactive');

var Script=function(logger) {
    var self=this;
    var db;
    var cache={};
    var ini;
    
    var scriptsQueue=[];
    var scriptsSemaphore=false;
    
    var levenshtein;
    
    var runscripts=function() {
        if (scriptsQueue.length==0) return null;
        if (scriptsSemaphore) return null;
        
        scriptsSemaphore=true;
        
        for (var i=0;i<scriptsQueue.length;i++) {
                
            var pass=true;
            
            if (typeof(scriptsQueue[i].script.conditions)=='object') {
                if (scriptsQueue[i].script.conditions.length>0) {
                    scriptsQueue[i].conditions = scriptsQueue[i].conditions.concat(scriptsQueue[i].script.conditions);
                }
            }

            for (var j=0; j<scriptsQueue[i].conditions.length; j++) {
                pass*=condition(db,scriptsQueue[i].conditions[j]);
                if (!pass) break;
            }                    

            
            var delay_suffix='';
            if (scriptsQueue[i].delay>0) {
                delay_suffix=' (in '+scriptsQueue[i].delay+' s.)';
            }
            if (pass) {
                
                logger.log(scriptsQueue[i].script.name+delay_suffix,scriptsQueue[i].script.log||'script');
                

                for(var j=0;j<scriptsQueue[i].script.actions.length;j++) {
                    
                
                    self.emit(scriptsQueue[i].script.actions[j].device,
                              scriptsQueue[i].script.actions[j].device,
                              scriptsQueue[i].script.actions[j],
                              scriptsQueue[i].delay,
                              scriptsQueue[i].ctx);
                }
            } else if (typeof(scriptsQueue[i].script.nactions)=='object' && scriptsQueue[i].script.nactions.length) {
                logger.log('!'+scriptsQueue[i].script.name+delay_suffix,scriptsQueue[i].script.log||'script');
            
            
                for(var j=0;j<scriptsQueue[i].script.nactions.length;j++) {


                    self.emit(scriptsQueue[i].script.nactions[j].device,
                              scriptsQueue[i].script.nactions[j].device,
                              scriptsQueue[i].script.nactions[j],
                              scriptsQueue[i].delay,
                              scriptsQueue[i].ctx);
                }
            }
            
            scriptsQueue.splice(i,1);
            scriptsSemaphore=false;
            setTimeout(runscripts,1);
            return pass;
        
        }
        
        scriptsSemaphore=false;
        setTimeout(runscripts,1000);
    }
    
    var run = function(script,delay,condition,ctx) {
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
        
        if (script=='-1' || script==-1) {
            self.emit('_cancel',ctx,delay);
            return;
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
        
        var conditions=[];
    
        if (condition!=null && condition.length>0) {
            var ca=condition.split('\n');
            for (var i=0; i<ca.length; i++) {
                var c=ca[i].match(/(.+)(=|>|<\!=)(.+)/);
                if (c==null) continue;
                var ioidx=c[1];
                
                var io=db.ios.get(ioidx);
                if (io==null) {
                    ioidx=ioidx.split('.');
                    if (ioidx.length==2) {
                        ios=db.ios.select([{device: ioidx[0], address: ioidx[1]}]);
                        if (ios.data.length==1) io=ios.data[0];
                    }
                    
                }
                if (io==null) continue;
            
                conditions.push({
                    haddr: io.haddr,
                    device: io.device,
                    condition: ['value',c[2],c[3]]
                });
            }
            
        }
        
        scriptsQueue.push({
            delay: delay,
            script: script,
            conditions: conditions,
            ctx: ctx
        });
        
        
        /*
         *run queue
         */
        var result=runscripts();
        
        /*
         *run subscripts
         */
        if (typeof(script.scripts)=='object' ) {
            for (var i=0;i<script.scripts.length;i++) {
                run(script.scripts[i],delay)
            }
        }
        
        return result;
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
            var lev=levenshtein.lev(str,all[id].name.toLowerCase());
            if (lev==0) return all[id].id;
            
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
                lev1=levenshtein.lev(str+' on',result[i][j].name.toLowerCase());
                lev2=levenshtein.lev(str+' off',result[i][j].name.toLowerCase());
            
                if (typeof(results[0][lev1])=='undefined') results[0][lev1]=[];
                results[0][lev1].push(result[i][j]);
                if (typeof(results[1][lev2])=='undefined') results[1][lev2]=[];
                results[1][lev2].push(result[i][j]);
            
                lev1=levenshtein.lev(str+' start',result[i][j].name.toLowerCase());
                lev2=levenshtein.lev(str+' stop',result[i][j].name.toLowerCase());
            
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
        
        
        if (parseInt(res[0])>0 && parseInt(res[1])>0 && !isNaN(parseInt(res[0])) && !isNaN(parseInt(res[1]))) {
            cache[str]=res;
            return res;
        }
        return null;
    }
    
    
    return {
        setdb: function(setdb,setini) {
            db=setdb;
            ini=setini;
            levenshtein=new Levenshtein(db.scripts,'name',ini.dictionary.synonyms||{});
            
        },
        
        on: function(event,fun) {
            self.on(event,fun);
        },
        
        run: function(script,delay,condition,ctx) {
            return run(script,delay,condition,ctx);
        },
        
        find: function(str) {
            return find(str);
        },
        
        set: function(io,value,ctx) {
            var set={haddr:io.haddr, value:value};
            self.emit(io.device,io.device,set,0,ctx);
        },
        
        toggle: function(io,ctx) {
            var set={haddr:io.haddr};
            self.emit(io.device,io.device,set,0,ctx);
        },
        
        get: function(s) {
            return db.scripts.get(s);
        },
        
        finder: function() {
            return levenshtein;
        }
    }
    
}

util.inherits(Script, EventEmitter);

module.exports=Script;