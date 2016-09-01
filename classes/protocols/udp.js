var util = require('util');
var EventEmitter = require('events').EventEmitter;
var net = require('net');
var dgram = require('dgram');
var os = require('os');
var fs = require('fs');


var Udp = function(options,logger) {
    var connected=false;
    var server = dgram.createSocket('udp4');
    var self=this;
    var sendQueue=[];
    var sendSemaphore=false;
    var sendLast=0;
    var sendTimers=[];
    
    if (typeof(options.latency)=='undefined') {
        options.latency=0;
    }
    
    var ifaces = os.networkInterfaces();
    
    for (var k in ifaces) {
        var ips=[];
        if (ifaces[k][0].internal) {
            delete(ifaces[k]);
            continue;
        }
        
        continue;
        for (var i=0; i<ifaces[k].length; i++) {
            if (ifaces[k][i].family=='IPv4') ips.push(ifaces[k][i].address);
        }

        if (ips.length==0) {
            
            continue;
        }
        ifaces[k] = {
            ip:ips,
            hw:fs.readFileSync('/sys/class/net/'+k+'/address').toString().trim()
        };
        
    }
    
    console.log(ifaces);
    

    
    var connect=function () {
        server.bind(options.port);
    }
    
    var send = function() {
        if (sendQueue.length==0) return;
        
        
        for (var i=0; i<sendTimers.length; i++) {
            clearTimeout(sendTimers[i]);
        }
        sendTimers=[];
        
        if (!connected) {
            sendTimers.push(setTimeout(send,100));
            return;
        }
        
        if (sendSemaphore) {
            sendTimers.push(setTimeout(send,options.latency));
            return;
        }
        
        if (sendLast>0 && Date.now()-sendLast<=options.latency && options.latency>0) {
            sendTimers.push(setTimeout(send,options.latency-Date.now()+sendLast+1));
            return;
        }
        
        sendSemaphore=true;
        
        sendLast=Date.now();
        
        var message=new Buffer(sendQueue[0].data);
        server.send(message,0,message.length,options.port,sendQueue[0].address,function(err,bytes) {
            sendQueue.shift();
            sendSemaphore=false;
            sendLast=Date.now();
            sendTimers.push(setTimeout(send,options.latency));
        });
       
    }
    
    server.on('listening', function () {
        var address = server.address();
        logger.log('UDP Server listening on ' + address.address + ":" + address.port,'init');
        self.emit('connection');
        send();
    });
    
    
    
    server.on('message', function (message, remote) {
    
        self.emit('data',{
            raw: remote,
            data: message.toString('utf8').trim()
        });  
    });
    
    return {
        connect: function() {
            connect();
        },
        disconnect: function() {
            connected=false;
            sendQueue=[];
            
        },
        on: function(event,fun) {
            self.on(event,fun);
        },
        
        send: function(str) {
            sendQueue.push(str);
            send();
            return connected;
        }
    }
}

util.inherits(Udp, EventEmitter);
module.exports = Udp;
