var url = require('url');
var fs = require('fs');
var crypto = require('crypto');
var exec = require('child_process').exec;
var settings = require('../common/hsettings');

var Charts = require('../../public/js/charts-calc');

var root_path=__dirname+'/../../public';
var flash_path=root_path+'/firmware';
var flash_file=flash_path+'/hk.bin';

var Web = function(com,ini,logger,callback) {
    var database;
    var websocket;
    var collection;
    
    var wifi={last:0};
    var charts = new Charts();

    
    com.staticContent(root_path);
    
    var getRandomInt = function (min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    };

    
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
        var session=opt.session[opt.hash];
        
        
        var collection_tables={};
        wifiscan();
        websocket.emit('lang',ini.lang,session.loggedin==null?false:session.loggedin);
        
        websocket.on('logout',function(){
            session.loggedin=false;
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
            session.loggedin=pass;
        });
        
        websocket.on('ping2',function(host) {
            var cmd='ping -c 1 -w 2 '+host;
        
            exec(cmd,function(err,stdout,stderr) {
                websocket.emit('ping2',stdout,stderr);
            });
        });
        
        websocket.on('wifi',function(wifi){
            if (!session.loggedin) return;
            
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
            if (!session.loggedin) return;
            var wait=0;
            if (buffer!=null) {

                for (var k in buffer) {
                    if (buffer[k]) {
                        wait=200;	
                        database.buffer.set({hwaddr:k, active:true});
                    } else {
                        wait=200;	
                        database.buffer.remove(k);
                        logger.log('Remove buffer: '+k,'db')
                    }
                }
                
            }
            
            setTimeout(function(){
                websocket.emit('buffer',database.buffer.select([{active:false}]));
            },wait);
        });

        websocket.on('ios',function(ios){
            if (!session.loggedin) return;
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
                    websocket.emit('ios',database.ios.getAll());
                },wait);
            }
        });
        var emitRegister = function (wait) {
            var flash=fs.statSync(flash_file);
            var flash_file_mtime=new Date(flash.mtime).getTime();
            
            setTimeout(function(){
                var buffer=database.buffer.select([{active:true}]);
                for (var i=0;i<buffer.data.length; i++) {
                    if (!buffer.data[i].flash || buffer.data[i].flash<flash_file_mtime) {
                        buffer.data[i].needFlash = true;
                    } else {
                        buffer.data[i].needFlash = false;
                    }
                    
                }
                websocket.emit('register',buffer);
            },wait);

        };
        
        websocket.on('flash',function(buffer){
            if (!session.loggedin) return;
            if (buffer==null || buffer.hwaddr==null) return;
            var b=global.clone(database.buffer.set(buffer));
            if (b!=null) {
                b.httpport=com.options().port;
                callback('firmware',b);
            }
            
        });
        
        websocket.on('reset',function(buffer){
            if (!session.loggedin) return;
            if (buffer==null || buffer.hwaddr==null) return;
            var b=global.clone(database.buffer.set(buffer));
            if (b!=null) {
                b.httpport=com.options().port;
                callback('reset',b);
            }
            
        });

        websocket.on('register',function(buffer){
            if (!session.loggedin) return;
            var wait=0;
            if (buffer!=null && buffer.hwaddr!=null) {
                database.buffer.set(buffer);
                wait=200;
            }

            emitRegister(wait);            
        });

        
        
        websocket.on('scripts',function(scripts){
            if (!session.loggedin) return;
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
                    websocket.emit('scripts',database.scripts.getAll());
                },wait);
            }
        });
        
        websocket.on('new-script',function(name){
            if (!session.loggedin) return;
            database.scripts.add({
                active: true,
                name: name
            });
            websocket.emit('scripts',database.scripts.select());
        });
        
        websocket.on('actions',function(a){
            if (!session.loggedin) return;
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
                var ioss=database.ios.select([{device:d.device}]);
                
                var ios={
                    active: true,
                    haddr: ini.uuid+'.'+d.device+'.'+rid(),
                    device: d.device,
                    io: 'o',
                    address: ioss.data.length+1,
                    name: d.name
                };
                database.ios.add(ios);
                websocket.emit('ios',database.ios.select());
            }
        });       
        
        websocket.on('collections',function(){
            var collections=database.ios.select([{store:['!=','']}]);
            
            for (var i=0; i<collections.data.length; i++) {
                var store=collections.data[i].store.split('/')[0];
                var temp_change=collections.data[i].temp_change;
                if (temp_change==null) temp_change=0;
           
                var color='rgba(0,0,0,0)';
                switch (temp_change) {
                    case -1:
                        color='rgba('+getRandomInt(0,150)+','+getRandomInt(0,150)+','+getRandomInt(100,255)+',0.2)';
                        break;
                    case 1:
                        color='rgba('+getRandomInt(100,255)+','+getRandomInt(0,150)+','+getRandomInt(0,150)+',0.2)';
                        break;
                    case 0:
                        color='rgba(255,255,0,0.2)';
                        break;

                    
                }
    
                collection_tables[store]={
                    name: collections.data[i].name,
                    value: collections.data[i].value,
                    id: store,
                    temp: temp_change,
                    color: color,
                    t_comfort: collections.data[i].t_comfort?parseFloat(collections.data[i].t_comfort):null,
                    t_eco: collections.data[i].t_eco?parseFloat(collections.data[i].t_eco):null,
                    t_nofrost: collections.data[i].t_nofrost?parseFloat(collections.data[i].t_nofrost):null,
                    t_hysteresis: collections.data[i].t_hysteresis?parseFloat(collections.data[i].t_hysteresis):null
                };
  
              
                if (collections.data[i].unit) {
                    collection_tables[store].value+=' '+collections.data[i].unit;
                }
            }
            
            websocket.emit('collections',collection_tables);
        
        });

        websocket.on('alias',function(ch){
            if (!database[ch.d]) return;
            database[ch.d].alias(ch.id,ch.a,function(r){
                websocket.emit('alias',r,ch.d);
            });
        });
        
        websocket.on('chart',function(tabs,from,period,id){
            var now=Date.now();    
            if (from==null) from=now;
            else from=charts.strtotime(from);
            
            var d=new Date(from);
    
            from-=d.getMilliseconds();
            
            
            switch (period) {
                case 'm12':
                    from = new Date(d.getFullYear(), 0, 1).getTime();
                    break;
                case 'm1':
                    var day=d.getDate()-1;
                    from-=1000*60*60*24*day - 4000*1000; // 4000 - summertime
                    break;                            
                
                
                case 'd7':
                    var day=d.getDay()-1;
                    if (day==-1) day=6;
                    from-=1000*60*60*24*day - 4000*1000; // 4000 - summertime
                    break;
                
                default: //24h
                    period='d1';  

            }
            
            d=new Date(from);
            from-=d.getMilliseconds();
            from-=1000*d.getSeconds();
            from-=1000*60*d.getMinutes();                    
            from-=1000*60*60*d.getHours();
            
            d=new Date(from);


            switch (period) {
                case 'm12':
                    to=new Date(new Date(from).getFullYear()+1, 0, 1).getTime()-1000;
                    break;
                case 'm1':
                    to=from+32*24*3600*1000;
                    d=new Date(to);
                    to-=1000*60*60*24*(d.getDate()-1);
                    d=new Date(to);
                    to-=d.getMilliseconds();
                    to-=1000*d.getSeconds();
                    to-=1000*60*d.getMinutes();                    
                    to-=1000*60*60*d.getHours();
                    
                    to-=1000; //one second before = yesterday
                    break;
                
                case 'd7':
                    to=from+7*24*3600*1000 - 3600*1000;
                    break;
                
                default: //24h
                    to=from+24*3600*1000;
            }

            
            var chartdata={};
            for (var i=0;i<tabs.length; i++) {
                collection.get(tabs[i],from,to,function(data){
                    chartdata[data.table]=data;
                    
                    for(var k in collection_tables[data.table])
                        chartdata[data.table][k] = collection_tables[data.table][k];
                    
                });
            }
            
            setTimeout(function(){
                var c=0;
                for(x in chartdata) c++;
                if (c<tabs.length) {
                    setTimeout(this._onTimeout,100);
                    return;
                }

                websocket.emit('chart',chartdata,collection_tables,from,to,period,id);
                
            },100);
            
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
                case '/logout':
                    response.statusCode = 401;
                    response.setHeader('Location','index.html');			
                    response.end();            
                    break;
                case '/say':
                case '/read':
                case '/toggle':    
                    var data=JSON.parse(JSON.stringify(request.query));
                    data.cb = function (txt) {
			try {
                        	if (typeof(txt)=='string') response.write(txt+'');
                        	else response.write(JSON.stringify(txt));
                        	response.end(); 
			} catch (e) {
			}
                    }
                
                    if ((ini.commandpass||Date.now())!=(request.query.p||0) ) {
                        data.cb('Proszę podać hasło!');
                        break;
                    }

                    var cmd;
                    switch (path) {
                        case '/say':
                            cmd='command';
                            break;
                        case '/read':
                            cmd='read';
                            break;
                        case '/toggle':
                            cmd='toggle';
                            break;
                    }
                    callback(cmd,data);
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
        
        initstate: function(db,_collection) {
            collection=_collection;
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