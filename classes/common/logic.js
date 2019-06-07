var condition=require('./condition');
var checkactive=require('./checkactive');
var Levenshtein=require('./levenshtein');
var utils=require('./utils');
var os = require('os');
var async = require('async');

var Logic = function(script,logger)
{
    var db;
    var collection;
    var ini;
    var ctxs={};
    
    var scrlev,ioslev,flolev;
    
    var startTime=Date.now();
 
 
    var store_data={};
    var store_add = function() {
        logger.log(store_data.store[0]+': '+store_data.io.value,'store');
        collection.add(store_data.store[0],store_data.io.value,null,null,store_data.io.temp_change==null?null:store_data.io.temp_change);
    };
    
    var globalTimerDecrease = function() {
        global.inputEventCounter--;  
    };
    
    var startInputTimer = function(timeout) {
        global.inputEventCounter++;
        setTimeout(globalTimerDecrease,timeout);
    }
    
    
    var run_actions = function(data,dbg_output,ctx) {
        var actions=db.actions.get(data);
        var scripts2run=[];
    
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
                            scripts2run.push({script:actions.actions[i].scripts[j],ctx:ctx});
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
        startInputTimer(scripts2run.length*300);
        for (var i=0; i<scripts2run.length; i++) script.run(scripts2run[i].script,0,null,scripts2run[i].ctx);
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
        io.value=value;
        io.last=now; 
        return true;
    };
    
    var evaluate_temp_expected_idx=null;
    
    var evaluate_temp = function(data,io) {
        var temp_expected;
        if (io.t_rel) {
            temp_expected=db.ios.get(io.t_rel);
        } else {
            if (evaluate_temp_expected_idx==null) {
                evaluate_temp_expected_idx='';
                var i=db.ios.select([{active:[1,true],address:['temp','temperature']}]);
                if (i.data.length>0) {
                    evaluate_temp_expected_idx=i.data[0].haddr;
                    logger.log('Temperature expected: '+evaluate_temp_expected_idx,'logic');
                }
            }
            if (evaluate_temp_expected_idx==null || evaluate_temp_expected_idx.length==0) {
                return;
            }
            
            temp_expected=db.ios.get(evaluate_temp_expected_idx);
        }
        
        if (temp_expected.value==null || temp_expected.value.length==0) return;
    
        if (io['t_'+temp_expected.value]==null ) return;
        if (io['t_'+temp_expected.value].length==0 ) return;
        var t_expected=parseFloat(io['t_'+temp_expected.value]);
        if (isNaN(t_expected) ) return;
        if (t_expected==0 ) return;
        
        var t_hysteresis = io['t_hysteresis'];
        if (t_hysteresis==null) t_hysteresis=0;
        else {
            t_hysteresis=parseFloat(t_hysteresis);
            if (isNaN(t_hysteresis)) t_hysteresis=0;
        }
        
        var value=parseFloat(data.value);
        
        if (t_hysteresis>=0) {
            if (value >= t_expected + t_hysteresis ) data.temp_change=-1;
            if (value <= t_expected - t_hysteresis ) data.temp_change=1;        
        } else {
            var prev=parseFloat(io.value);
            
            if ((value >= t_expected + t_hysteresis && value>prev) || value >= t_expected - t_hysteresis) data.temp_change=-1;
            if ((value <= t_expected - t_hysteresis && value<prev) || value <= t_expected + t_hysteresis) data.temp_change=1;  
        }

        
    };
    
    var getio=function(txt) {
        io=db.ios.get(txt);
        if (!io) {
            var a=txt.split('.');
            if (a.length==1) {
                var ios=db.ios.select([{address:txt}]);
                if (ios.data.length==1) {
                    io=ios.data[0];
                }
            } else {
                var dev=a[0];
                a.splice(0,1);
                var ios=db.ios.select([{device: dev,address:a.join('.')}]);
                if (ios.data.length==1) {
                    io=ios.data[0];
                }
            }
        }
        return io;
        
    };
    
    
    return {
        setdb: function (setdb,c,setini) {
            db=setdb;
            collection=c;
            scrlev=script.finder();
            ini=setini;
            ioslev=new Levenshtein(db.ios,'name',ini.dictionary.synonyms||{});
            //flolev=new Levenshtein(db.floor,'name',null,[{type:'polygon'}]);
            
        },
        
        action: function(device,type,data,ctx) {
                        
            var original_device=data.device||'';
            data.device=device;
            var io=db.ios.get(data);
            var io_cp=global.clone(io);
            
            
            switch (type) {
                
                case 'firmware':
                    script.firmware(original_device,data);
                    startInputTimer(15*1000);
                    break;
                
                case 'reset':
                    script.reset(original_device,data);
                    break;
                
                case 'read':
                case 'toggle':
                    if (!data.io || data.io.length==0) {
                        data.cb(ini.dictionary.dict.error);
                        break;
                    }
                    
                    var ios = data.io.split(',');
                    var result={};
                    async.map(ios,function(_io,next){
                        _io=_io.trim();
                        var f=false;
                        if (_io.indexOf(':')>0) {
                            var __io=_io.split(':');
                            _io=__io[0];
                            f=__io[1];
                        }
                        io=getio(_io);
                        
                        if (!io) {
                            return next();
                            return next(data.cb(ini.dictionary.dict.error));
                        }
                        
                        var io2=global.clone(io);
                        
                        if (type=='read') {
                            io2.last=io.last||0;
                            if(data.e || f=='e') evaluate(io2);
                            result[_io] = io2.unit && io2.unit.length>0 && io2.unitValue ? io2.unitValue : io2.value;
                            if (data.v && data.v==='last')
                                result[_io] = Math.round((Date.now()-io2.last)/1000);
                        }
                        
                        if (type=='toggle') {
                            startInputTimer(500);
                            script.toggle(io2);
                            result[_io] = 'OK';
                        }
                        return next();
                                            
                    },function(err){
                        if (err)
                            return data.cb(err);
                        data.cb(result);
                    });

                    break;
                
                case 'command':
                    
                    if (!data.q || data.q.length==0) {
                        data.cb(ini.dictionary.dict.error);
                        break;
                    }
                    
                    startInputTimer(3000);
                    
			/*
                    if (data.q.toLowerCase().indexOf(ini.dictionary.dict.calibrate.toLowerCase())>=0) {
                        
                        var flo=flolev.find(data.q);
                        
                        if (!flo || flo.length!=1 || !data.l) data.cb(ini.dictionary.dict.error);
                        else {
                            var latlng=data.l.split(',');
                            
                            db.floor.set({
                                lat: latlng[0],
                                lng: latlng[1],
                                alt: data.a
                            },flo[0].rec.id);
                            data.cb('ok');
                        }
                      
                        break;
                    }
			*/
                    
                    
                    var scr=scrlev.find(data.q);
                    var ios=ioslev.find(data.q);
                    var result='';
                    
                    if (scr && scr.length>3) {
                        scr=null;
                    }
                    if (ios && ios.length>3) {
                        ios=null;
                    }
                    
                    //console.log(scr,ios);
                    if (scr && scr.length>0) {
                        if (ios && ios.length>0 && ios[0].count-ios[0].matches < scr[0].count-scr[0].matches) {
                            //ios wins
                            scr=null;
                        } 
                    }
                    
                    if (scr && scr.length>0) {
                        for (var i=0; i<scr.length; i++){
                            if (!data.dont) {
                                var run=script.run(scr[i].rec.id);
                                if (run===true || run==null) result+=ini.dictionary.dict.done;
                                else result+=ini.dictionary.dict.notdone;
                                result+=': '+scr[i].rec.name+'. ';
                            } else {
                                result+='Gdyby nie testowanko, to wykonałabym: ' +scr[i].rec.name+'. ';
                            }

                              
                        }
                    } else if (ios && ios.length>0) {
                        for (var i=0; i<ios.length; i++){
                            if (ios[i].rec.unit && ios[i].rec.unit.length>0) {
                                result+=ios[i].rec.name+' '+(Math.round(10*ios[i].rec.value)/10)+' '+ios[i].rec.unit+'. ';
                            } else if (ios[i].rec.io!='i'){
                                result+=ini.dictionary.dict.state_change+': '+ios[i].rec.name+'. ';
                                if (!data.dont) script.toggle(ios[i].rec,ctx);
                            }
                        }
                    }
                    
                    if(result.length>0) {
                        data.cb(result);
                        break;
                    }
                    
                    
                    data.cb(ini.dictionary.dict.command_not_found);
                    break;
                
                case 'set':
                    if (io==null) return;
                    if (io_cp.value!=data.value) {
                        startInputTimer(300);
                        script.set(io,data.value,ctx);
                    }
                    break;
                
                case 'script':
                    startInputTimer(500);
                    script.run(data.script,null,null,ctx);
                    break;
                
                case 'output':
                    if (io==null) return;
                    
                    if (ctx!=null && ctxs[ctx]!=null && Date.now()-ctxs[ctx]<10000 && Date.now()-ctxs[ctx]>200) {
                        var lg=ctx+'->'+io.haddr+':'+data.value;
                        lg+=', time delta '+(Date.now()-ctxs[ctx])+' ms.';
                        if (global.gcTime.start>=ctxs[ctx]) lg+=' with GC ('+(global.gcTime.stop-global.gcTime.start)+'ms.)';
                        else lg+=' last GC '+(Date.now()-global.gcTime.stop)+'ms ago';
                        lg+=', load='+os.loadavg()[0];
                        logger.log(lg,'perf');
                    }
                    data.last=io.last||0;
                    data.eval=io.eval||null;
                    data.lastValue=io.value!=null?io.value:null;
                    evaluate(data);
                    evaluate_temp(data,io);
                    data.change=io.change||0;
                    if (io.unit && io.unit.length>0) {
                        if (!isNaN(parseFloat(io.lastValue)) && io.lastValue>io.value) data.change=1;
                        if (!isNaN(parseFloat(io.lastValue)) && io.lastValue<io.value) data.change=-1;
                                    data.unit=io.unit;
                        data.unitValue = io.value+utils.unit(data);
                    }

                    db.ios.set(data);
                    run_actions(data,false,ctx);
                    break;
                
                case 'input':
                    if (Date.now() - startTime < 1000*10) {
                        logger.log('Waiting 10 seconds before serving logic','init');
                        break;
                    }
                    
                    if (ctx!=null) ctxs[ctx]=Date.now();
                    startInputTimer(300);
                    
                    if (io==null) return;
                    if (data.device!==undefined) delete(data.device);
                    if (io==null) break;
                    if (!checkactive(io)) break; 
                    data.last=io.last||0;
                    data.eval=io.eval||null;
                    data.lastValue=io.value!=null?io.value:null;
                    var evaluated=evaluate(data);
                    evaluate_temp(data,io);
                    data.change=io.change||0;
                    if (io.unit && io.unit.length>0) {
                        if (!isNaN(parseFloat(io.lastValue)) && io.lastValue>io.value) data.change=1;
                        if (!isNaN(parseFloat(io.lastValue)) && io.lastValue<io.value) data.change=-1;
                        data.unit=io.unit;
                        data.unitValue = io.value+utils.unit(data);
                    }
                    db.ios.set(data);
                    //run_actions(data,!evaluated,ctx);
                    run_actions(data,false,ctx);
                    
                    break;
                    
                    
                
            }
            
            if (io!=null && io.store!=null && io.store.length>0) {
                var store=io.store.split('/');
                
            
                store_data.store=store;
                store_data.io=io;                              
                if (!collection.inited(store[0])) {
                    collection.init(store[0],store[2]||10,store[1]||60,store_add);
                } else {
                    store_add();
                }
            }
            
            return typeof(data.value)!='undefined' && io_cp.value!=data.value;
        }
    }
    
}

module.exports=Logic;
