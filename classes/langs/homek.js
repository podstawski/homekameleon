var url = require('url');
var fs = require('fs');
var crypto = require('crypto');
var exec = require('child_process').exec;
var settings = require('../common/hsettings');


var root_path=__dirname+'/../../public';

var Web = function(com,ini,logger,callback) {
    var database;
    var websocket;
    
    var wifi={last:0};
    
    com.staticContent(root_path);
    
    var md5=function(txt) {
        var md5sum = crypto.createHash('md5');
        md5sum.update(txt);
        return md5sum.digest('hex');
    };
    
    var rid=function(len) {
        if (len==null) len=8;
        var ret=md5(''+Date.now()).substr(0,len);
        return ret;
    }
    
	var wifiscan = function(cb) {
		if (wifi.last>Date.now()-60*1000) {
			setTimeout(function(){
				if (cb) cb(wifi.scan);
			},500);
			return;
		}
		exec('iwinfo ra0 scan',function(err,out,stderr){
			var res=out.match(/ESSID: "([^"]+)"/g);
			if (!res) return;
			wifi.last=Date.now();
			wifi.scan={};
			for (var i=0;i<res.length;i++) {
				var res2=res[i].match(/ESSID: "([^"]+)"/);
				var ssid=res2[1];
				if (ssid=='homekameleon') continue;
				if (ssid.toLowerCase().indexOf('linkit')>=0) continue;
                
				wifi.scan[ssid]=true;
			}	
			if (cb) cb(wifi.scan);
		});
	}

	wifiscan();
    
    com.on('initstate',function(opt,db) {
        database=db;
        websocket=opt.socket;
        
    
        wifiscan();
        websocket.emit('lang',ini.lang,opt.session.loggedin==null?false:opt.session.loggedin);
        
        websocket.on('logout',function(){
            opt.session.loggedin=false;
        });
        
        websocket.on('password',function(){
            websocket.emit('password',settings().password?true:false);
        });
        
        websocket.on('login',function(password){
            var pass;
            if (settings().password) {
                pass=settings().password==password;
            } else {
                settings({password:password});
                pass=true;
            }
            websocket.emit('login',pass);
            opt.session.loggedin=pass;
        });
        
        websocket.on('ping2',function(host) {
            var cmd='ping -c 1 -w 2 '+host;
        
            exec(cmd,function(err,stdout,stderr) {
                websocket.emit('ping2',stdout,stderr);
            });
        });
        
        websocket.on('wifi',function(wifi){
            if (!opt.session.loggedin) return;
            
            if (!wifi) {
                websocket.emit('wifi',{
                    ssid: settings().ssid,
                    wifipass: settings().wifipass
                    });
                wifiscan(function(wifis){
                    websocket.emit('wifis',wifis);
                });
            } else {
                var data={};
                for (var i=0; i<wifi.length; i++) data[wifi[i].name]=wifi[i].value;
                settings(data);
            };
            
        
        });
        
        websocket.on('buffer',function(buffer){
            if (!opt.session.loggedin) return;
            var wait=0;
            if (buffer!=null) {

                for (var k in buffer) {
                    if (buffer[k]) {
                        wait=200;	
                        database.buffer.set({hwaddr:k, active:true});
                    } else {
                        wait=200;	
                        database.buffer.remove(k);
                    }
                }
                
            }
            
            setTimeout(function(){
                websocket.emit('buffer',database.buffer.select([{active:false}]));
            },wait);
        });

        websocket.on('ios',function(ios){
            if (!opt.session.loggedin) return;
            var wait=0;
            if (ios!=null) {
                for (var k in ios) {
                    
                    if (typeof(ios[k])=='object') {
                        database.ios.set(ios[k]);
                     
                    } else {

                        if (ios[k]) {
                            wait=1000;
                            io=database.ios.get(k);
                            if (io.io=='i') callback('input',{haddr: io.haddr, value: io.value},io.haddr);
                            if (io.io=='o' || io.io=='r') callback('set',{haddr: io.haddr},io.haddr);
                        } else {
                            wait=100;	
                            database.ios.remove(k);
                        }
                            
                    }

                }
            }
  
            if (wait>=0) {          
                setTimeout(function(){
                    websocket.emit('ios',database.ios.select());
                },wait);
            }
        });

        websocket.on('scripts',function(scripts){
            if (!opt.session.loggedin) return;
            var wait=0;
            if (scripts!=null) {
                for (var k in scripts) {
                    
                    if (typeof(scripts[k])=='object') {
                        database.scripts.set(scripts[k]);
                        wait=100;
                    } else {

                        if (scripts[k]) {
                            wait=-1;
                            callback('script',{script:k});
        
                        } else {
                            wait=100;	
                            database.scripts.remove(k);
                        }
                            
                    }

                }
            }
  
            if (wait>=0) {          
                setTimeout(function(){
                    websocket.emit('scripts',database.scripts.select());
                },wait);
            }
        });
        
        websocket.on('new-script',function(){
            if (!opt.session.loggedin) return;
            database.scripts.add({
                active: true
            });
            websocket.emit('scripts',database.scripts.select());
        });
        
        websocket.on('actions',function(a){
            if (!opt.session.loggedin) return;
            if (typeof(a)=='string') websocket.emit('actions',database.actions.get(a));
            else {
                database.actions.set(a)
            }
        });
        
        websocket.on('ios-device',function(d){
            if (d==null) {
                var devices={};
                for(var i=0; i<ini.devices.length; i++) {
                    if (ini.devices[i].useradd) {
                        devices[ini.devices[i].id] = ini.devices[i].name;
                    }
                }
                websocket.emit('ios-device',devices);
            } else {
                var ioss=database.ios.select([{device:d}]);
                
                var ios={
                    active: true,
                    haddr: ini.uuid+'.'+d+'.'+rid(),
                    device: d,
                    io: 'o',
                    address: ioss.data.length+1
                };
                database.ios.add(ios);
                websocket.emit('ios',database.ios.select());
            }
        });       
        
        
    });



    
    com.on('notify',function(sockets,type,data) {        
        
        for (var i=0; i<sockets.length; i++) {
            sockets[i].socket.emit('bus',data.haddr,data.value);
        }
        
    });
    
    return {
        //Web router
        'request': function(request,response) {
            var path = url.parse(request.url).pathname;
 
            switch(path){
                case '/say':    
                    var data=JSON.parse(JSON.stringify(request.query));
                    data.cb = function (txt) {
                        response.write(txt);
                        response.end(); 
                    }
                
                    if ((ini.commandpass||Date.now())!=(request.query.p||0) ) {
                        data.cb('Proszę podać hasło!');
                        break;
                    }                    
                    
                    callback('command',data);
                    
                    break;
                case '/check-web':
                    response.setHeader('Access-Control-Allow-Origin', '*');
                    response.write('OK,'+request.headers.host);
                    response.end();            
                    break;
                default:
                    //response.writeHead(404);
                    response.write("opps this doesn't exist - 404");
                    response.end();
                    break;
            }        
    
        
        },
        
        'data': function(data) {
                
            if (data===undefined) {
                //code
            } else if (typeof(data)=='object') {

                if (typeof(data.haddr)=='string') {
                    logger.log('Click '+data.haddr+': '+data.value,'web');
                    
                    if (data.haddr=='script') {
                        callback('script',{script:data.value});
                    } else database.ios.get(data.haddr,function(io){
                        if (io.io=='i') callback('input',{haddr: data.haddr, value: data.value},data.haddr);
                        if (io.io=='o' || io.io=='r') callback('set',{haddr: data.haddr, value: data.value},data.haddr);
                    });           

                }
                
                if (typeof(data.haddr)=='object') {
                    for (var i=0;i <data.haddr.length; i++) {
                        
                        var io=database.ios.get(data.haddr[i]);
                        if (io==null) logger.log('IO not found: '+data.haddr[i],'error')
                        else data.socket.emit('bus',io.haddr,io.value);
                    
                    }
                }

            }

                        
            
        },
        

    }
    
}



module.exports = Web;