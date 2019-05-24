var condition=require('./condition');
var checkactive=require('./checkactive');
var utils=require('./utils');
var os = require('os');
var async = require('async');

var Smarthome = function(app,script,logger)
{
    var db;
    var collection;
    var ini;
    
    logger.log('Initializing actions-on-google SmartHome','init');
    
    function getDevices() {
        var devices=[];
        var ios=db.ios.select([{sh_type: ['!=',''], sh_traits: ['!=',''], active: [true,1,'1']}]);
  
        for (var i=0; i<ios.recordsTotal; i++) {
            
            var traits=ios.data[i].sh_traits.split(',');
        
            for (var j=0; j<traits.length; j++)
                traits[j]='action.devices.traits.'+traits[j];
            
            var nicknames=[];
            if (ios.data[i].sh_nicks)
                nicknames=ios.data[i].sh_nicks.split(',');
            devices.push({
                id: ios.data[i].haddr,
                type: 'action.devices.types.'+ios.data[i].sh_type,
                traits: traits,
                name: {
                    name: ios.data[i].name,
                    nicknames: nicknames
                },
                willReportState: true
            });
        }
        
        return devices;
    }
    
    function getDeviceStates(devices) {
        var result={};
        
        for (var i=0; i<devices.length; i++) {
            var device=db.ios.get(devices[i].id);
            if (device) {
                result[devices[i].id]={};
                
                if (device.sh_traits.indexOf('OnOff')!==-1)
                    result[devices[i].id].on = device.value===1 || device.value==='1';
                
                if (device.sh_traits.indexOf('OpenClose')!==-1 && device.io==='o') {
                    result[devices[i].id].openPercent= 0;
                }
                
                if (device.sh_traits.indexOf('OpenClose')!==-1 && device.io==='r') {
                   
                    if (device.value==='stop-u') {
                        result[devices[i].id].openPercent= 100;
                    }
                    if (device.value==='stop-d') {
                        result[devices[i].id].openPercent= 0;
                    }
                    if (device.value==='up') {
                        result[devices[i].id].openState = [{
                            openPercent: 50,
                            openDirection: 'UP'
                        }];
                    }
                    if (device.value==='down') {
                        result[devices[i].id].openState = [{
                            openPercent: 50,
                            openDirection: 'DOWN'
                        }];
                    }
                    
                }
            }
            
        }
        return result;
    }
    
    function execute(commands) {
        var result=[];
        
        for (var c=0; c<commands.length; c++) {
            if (!commands[c].devices || !commands[c].execution)
                continue;
            var command={
                ids:[],
                status: 'SUCCESS',
                states:{}
            };
            var error={
                ids:[],
                status: 'ERROR',
                errorCode: 'noSuchDevice'
            }
            for (var d=0; d<commands[c].devices.length; d++) {
                var device = db.ios.get(commands[c].devices[d].id);
                if (!device) {
                    error.ids.push(commands[c].devices[d].id);
                    continue;
                }
                for (var e=0; e<commands[c].execution.length; e++) {
                    var params=commands[c].execution[e].params;
                    if (commands[c].execution[e].command==='action.devices.commands.OnOff') {
                        script.set(device,params.on?1:0,'smarthome');
                        command.ids.push(device.haddr);
                        command.states.on=params.on;
                    } else if (commands[c].execution[e].command==='action.devices.commands.OpenClose' && device.io==='r') {
                        script.set(device,params.openPercent>0?'up':'down','smarthome');
                        command.ids.push(device.haddr);
                        command.states.openPercent=params.openPercent;
                    } else if (commands[c].execution[e].command==='action.devices.commands.OpenClose' && device.io==='o') {
                        script.set(device,1,'smarthome');
                        command.ids.push(device.haddr);
                        command.states.on=true;
                    } else {
                        console.log(commands[c].execution[e].command,device);
                    }
                }
            }
            if (command.ids.length>0)
                result.push(command);
            if (error.ids.length>0)
                result.push(error);
        }
        
        return result;
    }
    
    function intent(body,headers) {
        var payload={};
        
        if (body.inputs) 
            for (var i=0; i<body.inputs.length; i++) {
                if (body.inputs[i].intent) {
                    if (body.inputs[i].intent==='action.devices.SYNC')
                        payload.devices = getDevices();
                    else if (body.inputs[i].intent==='action.devices.QUERY')
                        payload.devices = getDeviceStates(body.inputs[i].payload.devices);
                    else if (body.inputs[i].intent==='action.devices.EXECUTE')
                        payload.commands = execute(body.inputs[i].payload.commands);
                    else
                        console.log(body);
                }
                
            }
     
        return {
          requestId: body.requestId,
          payload:payload
        }
    }
    
    app.onExecute(intent);
    app.onQuery(intent);
    app.onSync(intent);
 
    
    return {
        setdb: function (setdb,c,setini) {
            db=setdb;
            collection=c;
            ini=setini;
        
        }
    };
}

module.exports=Smarthome;