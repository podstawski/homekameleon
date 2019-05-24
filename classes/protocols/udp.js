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
    
    var ips = function() {
        var ifaces = os.networkInterfaces();
        var ips=[];
        
        for (var k in ifaces) {
            if (ifaces[k][0].internal) {
                delete(ifaces[k]);
                continue;
            }
            
            if (k.indexOf('tun')>=0) {
                delete(ifaces[k]);
                continue;
            }
            
            
            if (ifaces[k][0].netmask && ifaces[k][0].netmask=='255.0.0.0') {
                delete(ifaces[k]);
                continue;
            }
            
       
            for (var i=0; i<ifaces[k].length; i++) {
                if (ifaces[k][i].family=='IPv4') 
		{
			if (options.ip_exclude && options.ip_exclude.indexOf(ifaces[k][i].address)!=-1) {
				delete(ifaces[k]);
				break;
			}
			ips.push(ifaces[k][i]);
		}
            }
    
    
            
        }
        
        return ips;
    }
    
    
    var connect=function () {
        server.bind(options.port);
    }
    
    var send = function() {
	global.gcTime.timers.udp = sendQueue.length;
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
        
	var message;
	if(parseFloat(process.version.replace(/[^0-9.]*/g,''))>6)
        	message=Buffer.from(sendQueue[0].data.trim()+"\r\n");
	else
		message=new Buffer(sendQueue[0].data.trim()+"\r\n");
        server.send(message,0,message.length,options.port,sendQueue[0].address,function(err,bytes) {
            sendQueue.shift();
            sendSemaphore=false;
            sendLast=Date.now();
            sendTimers.push(setTimeout(send,options.latency));
        });
       
    }
    
    server.on('listening', function () {
        var address = server.address();
        logger.log('UDP Server listening on port '+ address.port,'init');
        self.emit('connection');
        connected=true;
        send();
    });
    
    
    
    server.on('message', function (message, remote) {
    
        self.emit('data',{
            address: remote.address,
            data: message.toString('utf8').trim()
        });  
    });
    
    var checkIP = function(ip) {
        return /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(ip);
    };
    
    var intToIP = function (iIP) {
        iIP=parseInt(iIP);
        
        var part1 = iIP & 255;
        var part2 = ((iIP >> 8) & 255);
        var part3 = ((iIP >> 16) & 255);
        var part4 = ((iIP >> 24) & 255);
    
        return part1 + "." + part2 + "." + part3 + "." + part4;
    }
    
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
            if (!checkIP(str.address)) {
                str.address=intToIP(str.address);
                if (!checkIP(str.address)) return;
            }
        
            sendQueue.push(str);
            send();
		
            return connected;
        },
        
        ips: function() {
            return ips();
        }
    }
}

util.inherits(Udp, EventEmitter);
module.exports = Udp;
