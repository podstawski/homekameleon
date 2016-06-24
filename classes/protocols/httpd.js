var util = require('util');
var EventEmitter = require('events').EventEmitter;
var http = require('http');
var os = require('os');
var exec = require('child_process').execFile;
var express = require('express');
var crypto = require('crypto');


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



var Httpd = function(options,logger) {
    var self=this;
    var httpServer,io;
    var httpClients=[];
    var ips=[];
    var tunnel_pid=0;
    var session={};
    var connected=false;
    var language;
    
    var app = express();
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
        
        var cmd='ssh';
        var cmd_args=['-nNT', '-o TCPKeepAlive=yes','-o ServerAliveInterval=60', '-R '+remoteport+':localhost:'+localport,userhost];
        logger.log('Trying to establish ssh tunnel: '+cmd+' '+cmd_args.join(' '),'net');
        
        var e=exec(cmd,cmd_args,function (error, stdout, stderr) {
            
            var delay=(new Date).getTime() - milliseconds;
            var startInSeconds=delay<10000?300:1;
            
            setTimeout(function(){
                tunnel(userhost,localport,remoteport);
            },1000*startInSeconds);
            
            if (error) logger.log(error,'error'); 
            logger.log('stderr: '+stderr.trim(),'net');
            logger.log('Waiting '+startInSeconds+'sec. for next ssh start.','net');
        
        });
        if (e.pid!=null) tunnel_pid=e.pid;
    }
    
    var hb=function() {
        
        if (!connected) return; 
        
        for (var x in httpClients) {
            httpClients[x].session.hb=Date.now();
        }
        
        for (var hash in session) {
            if (Date.now()-session[hash].hb > 24*3600*1000) {
                //24 hour session
                delete(session[hash]);
            }
        }
        
        setTimeout(hb,1000*60);
    }
    
    

    return {
        
        staticContent: function (pub) {
            app.use(express.static(pub));  
        },
        
        setLanguage: function(lang) {
            language=lang;
        },
        
        connect: function() {

            app.get('/*', function (request, response) {
                language.request(request, response);
            });
            
            
            httpServer=app.listen(options.port, function () {
                logger.log('Listening on http://localhost:'+options.port,'net');
                connected=true;
                hb();
            });
            
            io=require('socket.io').listen(httpServer);

            httpServer.on('error',function(e){
                logger.log('Can not listen on port '+options.port,'error');
            });
            
            
            
            if (typeof(options.tunnel_port)!='undefined' && typeof(options.tunnel_host)!='undefined') {
                tunnel(options.tunnel_host,options.port,options.tunnel_port);
            }
            
            
            io.sockets.on('connection', function(httpSocket) {
                
                var cookies=parseCookies(httpSocket.handshake.headers.cookie);
                
                if (typeof(cookies.sessid)!='undefined') {
                    var hash=cookies.sessid;
                } else {
                    var hash=md5(Math.random()+'_'+Date.now());
                    httpSocket.emit('cookie','sessid',hash);
                    
                }
                
                if (typeof(session[hash])=='undefined') {
                    session[hash]={};
                }
                
                session[hash].socket=httpSocket;
                session[hash].hb=Date.now();
                
                
                httpClients.push({socket:httpSocket,session:session[hash]});
                httpSocket.emit('web', {ips: ips, port:options.port});       
                self.emit('connection',{socket:httpSocket,session:session,hash:hash});
                
                
                httpSocket.on('disconnect', function() {                    
                    for (var x in httpClients) {
                         if (httpClients[x].socket==httpSocket) {
                            httpClients[x].session.socket=null;
                            httpClients.splice(x,1);
                            break;
                         }
                    }
                });
                
                httpSocket.on('bus', function(data){
                    data.socket=httpSocket;
                    self.emit('data',data);
                });
            });

            
        },
        disconnect: function() {
            connected=false;
            io.close();
            if (tunnel_pid>0) process.kill(tunnel_pid, 'SIGTERM');
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
