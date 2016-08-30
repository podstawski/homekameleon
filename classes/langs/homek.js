var url = require('url');
var fs = require('fs');
var exec = require('child_process').exec;


var root_path=__dirname+'/../../public';

var Web = function(com,ini,logger,callback) {
    var database;
    var websocket;
    var _settings=null;
    var wifi={last:0};
    
    com.staticContent(root_path);
    
	var wifiscan = function(cb) {
		if (wifi.last>Date.now()-60*1000) {
			console.log('no need to scan',cb);
			if (cb) cb(wifi.scan);
			return;
		}
		exec('iwinfo apcli0 scan',function(err,out,stderr){
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

    var settings = function(s) {
        var dir=__dirname+'/../../conf';
        var file=dir+'/web.json';
        var wifi=dir+'/wifi';
        
        if (s) {
            if (!_settings) _settings=s;
            else for (var k in s) _settings[k]=s[k];
            
            fs.writeFileSync(file,JSON.stringify(_settings));
            try {
                var e=exec('fsync '+file);
            } catch(e) {
                
            }
            
            if (_settings.ssid ) {
                fs.writeFileSync(wifi,_settings.ssid+' '+_settings.wifipass);
                
                try {
                    var e=exec('fsync '+wifi);
                    exec('reboot');
                } catch(e) {
                
                }
            } else {
                try {
                    fs.unlinkSync(wifi);
                } catch(e) {
                    
                }
            }
        }
        
        if (!_settings) {
            try{
                var d = fs.readFileSync(file);
                _settings = JSON.parse(d);
            } catch(e) {
                _settings={};
            }
        }
        
        return _settings;
    }
    
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
                console.log(wifi);
                var data={};
                for (var i=0; i<wifi.length; i++) data[wifi[i].name]=wifi[i].value;
                settings(data);
            };
            
        
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