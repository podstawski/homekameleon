<<<<<<< HEAD
var fs = require('fs');
var checkactive=require('./classes/common/checkactive');

var Structure = require('./classes/common/structure');
var Logger = require('./classes/common/logger');
var Device = require('./classes/common/device');
var Logic = require('./classes/common/logic');
var Script = require('./classes/common/script');
var Calendar = require('./classes/common/calendar');

var logger = new Logger('./logs');
var structure = new Structure(__dirname + '/conf/conf.json',logger);
var script = new Script(logger);
var calendar = new Calendar(logger,script);
var logic = new Logic(script,logger);



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
        
        logger.loadChannels(structureData['logger']);
        script.setdb(structure.db);
        logic.setdb(structure.db);
        
        if (typeof(structureData.calendars)!='undefined') {
            calendar.reggister(structureData.calendars);
            calendar.update();
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
            
            script.on(id,function(id,data) {
                devices[id].command(data);
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
    logger.save();
    process.exit(0);
}

process.on('SIGTERM',cleanEnd);
process.on('SIGINT',cleanEnd);



process.kill(process.pid, 'SIGHUP');
fs.writeFile(__dirname+'/app.pid',process.pid);

var cron = function() {
    var now=Math.round(Date.now()/1000);
    var min=(now/60)%60;
    if (min==0) calendar.update(); 
    calendar.run();
    setTimeout(cron,60000);    
}

var now=Math.round(Date.now()/1000);
setTimeout(cron, 1000*(60-(now%60)));



=======
var express = require('express');
var app = express();
var crypto = require('crypto');
var admin = require('./admin');
var simpleserver = require('./simpleserver');
var fs = require('fs');

var ini = require('./ini.default.js');

try {
    fs.lstatSync('./ini.js');
    var ini2 = require('./ini.js');
    for (var k in ini2) if (k!='database') ini[k]=ini2[k];
    
    if (ini2.database !== undefined) {
        for (var k in ini2.database) ini.database[k]=ini2.database[k];
    }
        
} catch(e) {
    console.log('File ini.js missing!');
}



var port=ini.port;
if (process.argv[2]!==undefined) port=parseInt(process.argv[2]);

var database={};
var session=[];
var models={};

for (var k in ini.database) { 
    if (models[ini.database[k].model]===undefined) {
      models[ini.database[k].model] = require('./models/'+ini.database[k].model);
    }
    database[k] = new models[ini.database[k].model]( ini.database[k] );
}


function parseCookies (rc) {
    var list = {};

    rc && rc.split(';').forEach(function( cookie ) {
        var parts = cookie.split('=');
        list[parts.shift().trim()] = decodeURI(parts.join('='));
    });

    return list;
}

function md5(txt) {
    var md5sum = crypto.createHash('md5');
    md5sum.update(txt);
    return md5sum.digest('hex');
}


var initApp = function() {
    for(var k in database) {
        if (!database[k].inited()) {
            database[k].init(initApp);
            return;
        } 
      
    }
    
    var server=new simpleserver(session);
    console.log('Database initialized!');


    app.use(express.static('public'));
    
    
    var io = require('socket.io').listen(app.listen(port, function () {
        console.log('App listening on port',port);
    }));
    
    
    io.sockets.on('connection', function (socket) {
        
        var cookies=parseCookies(socket.handshake.headers.cookie);
    
        if (typeof(cookies.sessid)!='undefined') {
            var hash=cookies.sessid;
        } else {
            var hash=md5(Math.random()+'_'+Date.now());
            socket.emit('cookie','sessid',hash);
        }
      
        if (typeof(session[hash])=='undefined') {
            session[hash]={};
        }
        
        session[hash].socket=socket;
        
        socket.on('disconnect',function() {
            console.log('Bye client ',hash);
            if (typeof(session[hash])!='undefined') {
                session[hash].socket=null;
            }
        });
                  

        socket.on('credentials',function(){
            fs.readFile('credentials.json',function(error,d) {
                socket.emit('credentials',JSON.parse(d));
            });
        });
                  
        console.log('Hello new client',hash); 
        var adm=admin(socket,session,hash,database,'./public',ini,console);
        server.run(socket);
        
        
        /*
        adm.debug(2,function(d){
            console.log(d);
            console.log(d.data[0]._elements);
            
        });
        */
        
    });

        
}


fs.writeFile(__dirname+'/app.pid',process.pid);

initApp();
>>>>>>> eeddad8f6dd3f5cbff7b77cea10e573a1b8e515c

