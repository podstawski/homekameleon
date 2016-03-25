var util = require('util');
var EventEmitter = require('events').EventEmitter;
var http = require('http');
var io = require('socket.io');
var os = require('os');
var exec = require('child_process').exec;

var Httpd = function(options,logger) {
    var self=this;
    
    var httpServer;
    var listener;
    var httpClients=[];
    var ips=[];
    var tunnel_pid=0;
    
    var ifaces = os.networkInterfaces();
    
    Object.keys(ifaces).forEach(function (ifname) {
      var alias = 0;
    
      ifaces[ifname].forEach(function (iface) {
        if ('IPv4' !== iface.family || iface.internal !== false) {
          return;
        }
        ips.push(iface.address);
        
      });
    });
    
    var tunnel = function (userhost,localport,remoteport) {
        
        var milliseconds = (new Date).getTime();
        
        var cmd='ssh -nNT -o TCPKeepAlive=yes -o ServerAliveInterval=60 -R '+remoteport+':localhost:'+localport+' '+userhost;
        logger.log('Trying to establish ssh tunnel: '+cmd,'net');
        
        var e=exec(cmd,function (error, stdout, stderr) {
            
            var delay=(new Date).getTime() - milliseconds;
            var startInSeconds=delay<10000?300:1;
            
            setTimeout(function(){
                tunnel(userhost,localport,remoteport);
            },1000*startInSeconds);
            
            
            logger.log('stderr: '+stderr.trim(),'net');
            logger.log('Waiting '+startInSeconds+'sec. for next ssh start.','net');
        
        });
        tunnel_pid=e.pid;
    }
    

    return {
        connect: function() {
            httpServer = http.createServer(function(request, response) {
                self.emit('request',request,response);  
            });
            httpServer.listen(options.port);
            logger.log('Listening on http://localhost:'+options.port,'net');
            
            if (typeof(options.tunnel_port)!='undefined' && typeof(options.tunnel_host)!='undefined') {
                tunnel(options.tunnel_host,options.port,options.tunnel_port);
            }
            
            listener = io.listen(httpServer);
            
            listener.sockets.on('connection', function(httpSocket){
                httpClients.push(httpSocket);
                httpSocket.emit('web', {ips: ips, port:options.port});       
                self.emit('connection',httpSocket);
                
                
                httpSocket.on('disconnect', function() {                    
                    for (var x in httpClients) {
                         if (httpClients[x]==httpSocket) {
                            httpClients.splice(x,1);
                         }
                    }
                });
                
                httpSocket.on('input', function(data){
                    self.emit('data',data);
                });
            });

            
        },
        disconnect: function() {
            listener.close();
            httpServer.close();
        },
        on: function(event,fun) {
            self.on(event,fun);
        },

        initstate: function(socket,db) {
            self.emit('initstate',socket,db);
        },
        
        notify: function(type,data) {
            self.emit('notify',httpClients,type,data);
    
        }
        

    }
}

util.inherits(Httpd, EventEmitter);
module.exports = Httpd;
