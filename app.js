var fs = require('fs');
var os = require('os');
var checkactive=require('./classes/common/checkactive');

var Structure = require('./classes/common/structure');
var Logger = require('./classes/common/logger');
var Device = require('./classes/common/device');
var Logic = require('./classes/common/logic');
var Script = require('./classes/common/script');
var Collection = require('./classes/common/collection');

var logger = new Logger('./logs');
var structure = new Structure(__dirname + '/conf/conf.json',logger);
var script = new Script(logger);
var logic = new Logic(script,logger);
var calendar=null;


var structureData;
var devices=[];

global.clone=function(o) {
    return JSON.parse(JSON.stringify(o));
}

script.on('_cancel',function(ctx,delay){
    for (var id in devices) devices[id].cancel(ctx,delay);
});


/*
 * overall init may be initiated by signal HUP
 * therefore afterward we push (kill) the HUP signal to ourselves
 */

process.on('SIGHUP',function () {
    var data=structure.get(function () {
        for(var i=0; i<structureData.devices.length; i++) {
            var id=structureData.devices[i].id;
        
            if (devices[id]!=null) devices[id].dbready(structure.db);
        }
    });
    if (typeof(data)=='object' && data!=null) {
        structureData=data;
        
        var collection=new Collection(__dirname + '/conf/'+(data.collection||'collection.db'));
        
        logger.loadChannels(structureData['logger']);
        script.setdb(structure.db,structureData);
        logic.setdb(structure.db,collection,structureData);
        

        
        if (typeof(structureData.calendars)!='undefined' && structureData.calendars.length) {
            if (calendar==null) {
                var Calendar = require('./classes/common/calendar');
                calendar = new Calendar(logger,script);
            }
            calendar.reggister(structureData.calendars);
            setTimeout(function() {
                calendar.update();
            },1000);
            
        }
        
        for(var i=0; i<structureData.devices.length; i++) {
            if (!checkactive(structureData.devices[i])) continue;
            
            var id=structureData.devices[i].id;
            if (typeof(devices[id])!='undefined') {
                logger.log('Disconnecting '+structureData.devices[i].name,'init');
                devices[id].disconnect();
                delete(devices[id]);
            }
            logger.log('Initializing '+structureData.devices[i].name,'init');
            devices[id] = new Device(id,structureData.devices[i].protocol,structureData.devices[i].language,structureData.devices[i].com,data,logger);
            
            devices[id].on('data',function(id,type,data,ctx) {
                var changed=logic.action(id,type,data,ctx);
                if (type=='set' || !changed) return; // don't notify
                
                for (var id2 in devices) {
                    if (id!=id2) {
                        devices[id2].notify(type,data);
                    }
                }
            });
            
            devices[id].on('connection',function(id,data) {
                devices[id].initstate(data,structure.db);
            });
            
            script.on(id,function(id,data,delay,ctx) {
                devices[id].command(data,delay,ctx);
            });
            
            devices[id].connect();
        }
    }   
});

var cleanEndStarted=false;
var cleanEnd=function() {
    if (cleanEndStarted) return;
    cleanEndStarted=true;
    console.log('');
    for (k in structure.db) {
        structure.db[k].ultimateSave();
        break;
    }
    
    
    for (id in devices) {
        devices[id].disconnect();
    }
    
    logger.save();

    process.exit(0);
}

process.on('SIGTERM',cleanEnd);
process.on('SIGINT',cleanEnd);

process.on('SIGTSTP',function(){
    console.log('');
    if (calendar!=null) calendar.ctrlz();
    for (id in devices) {
        devices[id].ctrlz();
    }
});


process.kill(process.pid, 'SIGHUP');
fs.writeFile(__dirname+'/app.pid',process.pid);

var cron = function() {
    setTimeout(cron,60000);   
    //if (global.gc) global.gc();

    var now=Math.round(Date.now()/1000);
    var min=(now/60)%60;



    if (calendar!=null) {

        calendar.run();
    
        if (Math.floor(min)==0) setTimeout (function(){
            calendar.update();
        },10000); 
    }
    
}

var now=Math.round(Date.now()/1000);
setTimeout(cron, 1000*(60-(now%60)));

if (global.gc) {
	setInterval(function(){
		var load=os.loadavg()[0];
		//console.log(load);
		if (load<0.2) global.gc();
	},5000);
}
