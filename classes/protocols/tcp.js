var util = require('util');
var EventEmitter = require('events').EventEmitter;
var net = require('net');

var Tcp = function(options,logger) {
    var connected=false;
    var client = new net.Socket();
    var self=this;
    var sendQueue=[];
    var sendSemaphore=false;
    var sendLast=0;
    var sendTimers=[];
    
    if (typeof(options.latency)=='undefined') {
        options.latency=0;
    }
    
    var connect=function () {
        logger.log('Connecting to '+options.host+':'+options.port,'init');
        client.connect(options.port, options.host, function() {
            if (!connected) {
                connected=true;
                logger.log('Connected to '+options.host+':'+options.port,'init');
                self.emit('connection');
                send();
            }
            
        });
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
        //console.log('Sendingg',Date.now(),Date.now()-sendLast,sendQueue[0].trim());
        sendLast=Date.now();
        client.write(sendQueue[0],'utf-8',function() {
            sendQueue.shift();
            sendSemaphore=false;
            sendLast=Date.now();
            sendTimers.push(setTimeout(send,options.latency));
        });
       
    }
    
    client.on('error', function() {
        logger.log('Host '+options.host+':'+options.port+' unreachable','error');
        client.end();
        setTimeout(connect,10*1000);
    });
    
    client.on('data', function(data) {
        var line=data.toString('ascii');
        self.emit('data',line.trim());    
    });
    
    client.on('end',function() {
        if (connected) {
            connected=false;
            connect();
        }
    });
    
    return {
        connect: function() {
            connect();
        },
        disconnect: function() {
            connected=false;
            client.end();
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

util.inherits(Tcp, EventEmitter);
module.exports = Tcp;
