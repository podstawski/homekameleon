var fs = require('fs');

var Structure = require('./classes/common/structure');
var Logger = require('./classes/common/logger');
var Device = require('./classes/common/device');
var Logic = require('./classes/common/logic');
var Scenario = require('./classes/common/scenario');
var Calendar = require('./classes/common/calendar');

var logger = new Logger('./logs');
var structure = new Structure(__dirname + '/conf/structure.json',logger);
var scenario = new Scenario(logger);
var calendar = new Calendar(logger,scenario);
var logic = new Logic(scenario,logger);

var structureData;
var devices=[];

/*
 * overall init may be initiated by signal HUP
 * therefore afterward we push (kill) the HUP signal to ourselves
 */

process.on('SIGHUP',function () {
    var data=structure.get();
    if (typeof(data)=='object') {
        structureData=data;
        
        scenario.setdb(structure.db);
        logic.setdb(structure.db);
        
        if (typeof(structureData.calendars)!='undefined') {
            calendar.reggister(structureData.calendars);
            calendar.update();
        }
        
        for(var i=0; i<structureData.devices.length; i++) {
            var id=structureData.devices[i].id;
            if (typeof(devices[id])!='undefined') {
                devices[id].disconnect();
            }
            logger.log('Initializing '+structureData.devices[i].name,'init');
            devices[id] = new Device(id,structureData.devices[i].protocol,structureData.devices[i].language,structureData.devices[i].com,logger);
            
            devices[id].on('data',function(id,type,data) {
                logic.action(id,type,data);
                for (var id2 in devices) {
                    if (id!=id2) {
                        devices[id2].notify(type,data);
                    }
                }
            });
            
            devices[id].on('connection',function(id,data) {
                devices[id].initstate(data,structure.db);
            });
            
            scenario.on(id,function(id,data) {
                devices[id].command(data);
            });
            
            devices[id].connect();
        }
    }   
});

process.kill(process.pid, 'SIGHUP');
fs.writeFile(__dirname+'/homiq.pid',process.pid);

var cron = function() {
    var now=Math.round(Date.now()/1000);
    var min=(now/60)%60;
    if (min==0) calendar.update(); 
    calendar.run();
    setTimeout(cron,60000);    
}

var now=Math.round(Date.now()/1000);
setTimeout(cron, 1000*(60-(now%60)));


/*
 * wait before everything starts
 */
setTimeout(function() {}, 1000);


