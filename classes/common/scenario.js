var util = require('util');
var EventEmitter = require('events').EventEmitter;
var condition=require('./condition');
var levenshtein=require('./levenshtein');

var Scenario=function(logger) {
    var self=this;
    var db;
    var cache={};
    
    var scenariosQueue=[];
    var scenariosSemaphore=false;
    
    var runscenarios=function() {
        if (scenariosQueue.length==0) return;
        if (scenariosSemaphore) return;
        
        scenariosSemaphore=true;
        
        for (var i=0;i<scenariosQueue.length;i++) {
            if (scenariosQueue[i].when<=Date.now()) {
                
                var pass=true;
                
                if (typeof(scenariosQueue[i].scenario.conditions)=='object') {
                    for (var j=0; j<scenariosQueue[i].scenario.conditions.length; j++) {
                        pass*=condition(db,scenariosQueue[i].scenario.conditions[j]);
                        if (!pass) break;
                    }                    
                }
                
                if (pass) {
                    logger.log(scenariosQueue[i].scenario.name,'scenario');
                    

                    for(var j=0;j<scenariosQueue[i].scenario.actions.length;j++) {
                        
                        self.emit(scenariosQueue[i].scenario.actions[j].device,
                                  scenariosQueue[i].scenario.actions[j].device,
                                  scenariosQueue[i].scenario.actions[j]);
                    }
                }
                
                scenariosQueue.splice(i,1);
                scenariosSemaphore=false;
                setTimeout(runscenarios,1);
                return;
            }
        }
        
        scenariosSemaphore=false;
        setTimeout(runscenarios,1000);
    }
    
    var run = function(scenario,delay) {
        if (delay==null) delay=0;
        
        /*
         *check if scenario is object and has delay defined
         */
        if (typeof(scenario)=='object' && typeof(scenario.scenario)=='string') {
            if (typeof(scenario.delay)!='undefined') {
                delay+=parseFloat(scenario.delay);
            }
            scenario=scenario.scenario;
        }
        
        /*
         *get database for specified scenario id
         */
        scenario=db.scenarios.get(scenario);
        if (scenario==null) return;
        
        var typeofactive=typeof(scenario['active']);
        if (typeofactive=='string') if (scenario.active=='0') return;
        if (typeofactive=='boolean') if (scenario.active==false) return;
        if (typeofactive=='integer') if (scenario.active==0) return;
        
        /*
         *queue scenario
         */
        var when=Date.now()+1000*delay;
        
        scenariosQueue.push({
            when: when,
            scenario: scenario
        });
        
        /*
         *run queue
         */
        runscenarios();
        
        /*
         *run subscenarios
         */
        if (typeof(scenario.scenarios)=='object' ) {
            for (var i=0;i<scenario.scenarios.length;i++) {
                run(scenario.scenarios[i],delay)
            }
        }
        
    } 
    
    var find=function(str) {
        if (typeof(cache[str])!='undefined') return cache[str];
        
        var s=db.scenarios.get(str);
        if (s!=null) {
            cache[str]=s.id;
            return s.id;
        }
        
        var all=db.scenarios.getAll();
        
        str=str.toLowerCase();
        
        var result={};
        for (var id in all) {
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
        
        run: function(scenario,delay) {
            run(scenario,delay);
        },
        
        find: function(str) {
            return find(str);
        }
    }
    
}

util.inherits(Scenario, EventEmitter);

module.exports=Scenario;