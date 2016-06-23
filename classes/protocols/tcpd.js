var util = require('util');
var EventEmitter = require('events').EventEmitter;
var net = require('net');

var Tcpd = function(options,logger) {
    var connected=false;
    var client = new net.Socket();
    var self=this;
    var sendQueue=[];
    var sendSemaphore=false;
    var lastData=0;
    var lastSocket=null;
    
    if (typeof(options.latency)=='undefined') {
        options.latency=0;
    }
    
    var connect=function () {
        var daemon = net.createServer(function(socket) {
            if (lastSocket!=null) {
                socket.write("Only one client permited, sorry\r\n");
                socket.end();
                return;
            }
            lastSocket=socket;
            self.emit('request',socket);
            connected=true;
            socket.on('end' , function () {
                connected=false;
                lastSocket=null;
            });
            socket.on('data',function(data){
                //console.log('Received',Date.now(),Date.now()-lastData,data.toString('ascii').trim());
                if (Date.now()-lastData<options.latency) {
                    logger.log('Data comes too fast: '+(Date.now()-lastData),'error');
                }
                lastData=Date.now();
                var line=data.toString('ascii');
                self.emit('data',line.trim()); 
            });
        });
        
        daemon.on('error',function(e){
            logger.log('Can not listen on port '+options.port,'error');
        });
        
        
        daemon.listen(options.port);
        
    }
    
    
    return {
        connect: function() {
            connect();
        },
        disconnect: function() {
            connected=false;
            if (lastSocket!=null) lastSocket.end();
            
        },
        on: function(event,fun) {
            self.on(event,fun);
        },
        
        send: function(str) {
            if (connected && lastSocket!=null) {
                lastSocket.write(str);
            }
            return connected;
        }
    }
}

util.inherits(Tcpd, EventEmitter);
module.exports = Tcpd;
