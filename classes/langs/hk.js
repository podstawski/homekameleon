var crypto = require('crypto');
var crc8 = require('crc');
var fs = require('fs');
var exec = require('child_process').exec;
var settings = require('../common/hsettings');

var attempts=20;
var attempt_delay=300;

var pos_cmd=0;
var pos_src=1;
var pos_dev=2;
var pos_dst=3;
var pos_typ=4;
var pos_val=5;
var pos_idx=6;
var pos_crc=7;

var pos_inputs = 2;
var pos_outputs = 3;


module.exports = function(com,ini,logger,callback) {
    var counter=0;
    var sendQueue=[];
    var sendSemaphore=false;
    var buf='';
    var self=this;
    var sendTimers=[];
    var database;
    var deviceId;

        
    var nocolon = function(txt) {
      
        return txt.replace(/:/g,'');  
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
    
    var crc = function (cmd) {
        
        var str=cmd[pos_cmd]+cmd[pos_src]+cmd[pos_dev]+cmd[pos_dst]+cmd[pos_typ]+cmd[pos_val]+cmd[pos_idx]+settings().hash;
        var res=crc8.crc8(str);
        return res;
    }
    
    if (!settings().hash) {
        settings({hash: rid()});
    }

    
    var deletefuture = function (params) {
        for (var i=0; i<sendQueue.length; i++) {
            if (sendQueue[i].str.length>0) continue;
            if (sendQueue[i].when - Date.now() < 500) continue;
            
            var pass=true;
            for (var k in params) {
                if (params[k]!=sendQueue[i].cmd[k]) {
                    pass=false;
                    break;
                }
            }
            if (pass) {
                sendQueue.splice(i,1);
                i--;
            }
        }
        
    };
    
    var search_str = function (arr,to) {
        return arr[pos_cmd]+':'+arr[to?pos_dst:pos_src]+':'+arr[pos_dev]+':'+arr[pos_idx];  
    };
    
    var idx = function() {
        counter=(counter%255)+1;
        return counter;
    };
    
    var send = function(cmd,delay) {

        for (var i=0; i<sendTimers.length; i++) {
            clearTimeout(sendTimers[i]);
        }
        sendTimers=[];
        
        var now=Date.now();
        
        if (delay==null) delay=0;
                
        if (cmd!=null) {    
            sendQueue.push({str: '', sent: 0, count: 0, when:now+1000*parseFloat(delay), search: '', cmd: cmd});
        }
        
        if (sendSemaphore) {
            sendTimers.push(setTimeout(send,10));
            return;
        }
        
        sendSemaphore=true;
        var nextHop=10000;
        
        for (var i=0; i<sendQueue.length; i++) {
            if ( sendQueue[i].when > now) {
                if (sendQueue[i].when-now < nextHop) {
                    nextHop=sendQueue[i].when-now;
                }
                continue;
            }
            
            if ( now-sendQueue[i].sent < attempt_delay) {
                if (nextHop > attempt_delay-now+sendQueue[i].sent) {
                    nextHop = attempt_delay-now+sendQueue[i].sent;
                }
                continue;
            }
            if ( sendQueue[i].count>=attempts) continue;
            
            var device=database.buffer.get(sendQueue[i].cmd.dev);
            
            if (sendQueue[i].str.length==0) {
                var arr=new Array;
                
                arr[pos_cmd]=sendQueue[i].cmd.cmd;
                arr[pos_val]=sendQueue[i].cmd.val;
                arr[pos_src]=sendQueue[i].cmd.src;
                arr[pos_dst]=sendQueue[i].cmd.dst;
                arr[pos_dev]=sendQueue[i].cmd.sub;
                arr[pos_idx]=idx();
                arr[pos_typ]='C';
                arr[pos_crc]=crc(arr);
                
                sendQueue[i].str='('+arr.join(';')+')';
                sendQueue[i].search = search_str(arr,true);
            
            }
            sendQueue[i].ip=device.ip;
            
                
            var msg=sendQueue[i].str;
            
            var res=com.send({
                data: msg+"\r\n",
                address: sendQueue[i].ip
            });
            

            if (!res) {
                sendQueue[i].when=now+1000;
                if (nextHop>1000) nextHop=1000;
            } else {
                sendQueue[i].count++;
                sendQueue[i].sent=now;
                logger.log('Sending: '+msg,'frame');
            }
            
            
            
        }
        
        for (var i=0; i<sendQueue.length; i++) {
            
            if ( now-sendQueue[i].sent<attempt_delay) continue;
            
            if ( sendQueue[i].count>=attempts ) {
                sendQueue.splice(i,1);
                i--;
                continue;
            }
             
        }
        
        if (sendQueue.length>0 && nextHop>attempt_delay) nextHop=attempt_delay;
        

        sendSemaphore=false;
        if (sendQueue.length>0) sendTimers.push(setTimeout(send,nextHop));
        
    }
    
    
    
    
    var hset = function(data,delay2,ctx) {
        var io=database.ios.get(data.haddr);
        if (io==null) return;
        var value=data.value;
        var delay = typeof(data.delay)=='undefined' ? 0 : data.delay;
        
        delay+=delay2||0;
        
        var adr=io.address.split('.');
        var device=database.buffer.get(adr[0]);
        
        var mac=macaddress(device.ip,device.homekameleon);
        
        switch (value) {
            default:
                
                if (!isNaN(parseFloat(value))) {
                    
                    /*
                    if (delay==0) {
                        deletefuture({
                            cmd: 'O.'+adr[1],
                            dst: adr[0],
                        });
                    }
                    */
                    
                    send({
                        cmd: 'O',
                        dev: device.hwaddr,
                        dst: device.address,
                        sub: adr[2],
                        val: value,
                        src: mac.mac,
                        ctx: ctx
                    },delay);
                    
                }
                
                break;

        }
        
        
    };
    
    var toggle = function(data) {
        var io=database.ios.get(data.haddr);
        return parseFloat(io.value)>0?0:1;
    };
    
    
    var macaddress = function(ip,local) {
        var ips=com.ips();
        for (var i=0; i<ips.length; i++) {
            if (ips[i].netmask==null) ips[i].netmask='255.255.255.0';
            if (ips[i].mac==null) ips[i].mac=rid(12);
        }
        
        if (ips.length==1) return {ip:ips[0].address, mac: ips[0].mac};
        
        for (var i=0; i<ips.length; i++) {
            if (local && ips[i].address=='192.168.100.1' ) {
                return {ip:ips[i].address, mac: ips[i].mac};
            }
            if (!local && ips[i].address!='192.168.100.1' ) {
                return {ip:ips[i].address, mac: ips[i].mac};
            }
        }
        
    }
    
    var restore_ios = function(hwaddress,inputoroutput,subaddr) {
    
        var haddr=address2haddr(hwaddress,subaddr,inputoroutput);
        
        var ios=database.ios.get(haddr);
        var dash=hwaddress.indexOf('-');
        if (dash>0) {
            var name=hwaddress.substr(dash+1);
        } else {
            var name=hwaddress;
        }
        if (ios==null) {
           
            database.ios.add({
                haddr: haddr,
                name: name,
                device: deviceId,
                address: hwaddress.replace('.','_')+'.'+inputoroutput+'.'+subaddr,
                io: inputoroutput,
                value: 0,
                active: true
            });
        } else {
           
            database.ios.set({
                haddr: haddr,
                value: 0
            });
        }
        
    };
    
    var initack = function(data) {
        if (!data.active) return;
        
        var mac=macaddress(data.ip,data.homekameleon);
                
        if (data.homekameleon) {
            var ssid='';
            var wifipass='';
        } else {
            var ssid=settings().ssid;
            var wifipass=settings().wifipass;
        }
        
        
        for (var i=0; i<parseInt(data.inputs); i++) {
            restore_ios(data.address,'i',i+1);
        }
        
        for (var i=0; i<parseInt(data.outputs); i++) {
            restore_ios(data.address,'o',i+1);
        }
        
        com.send({
            address: data.ip,
            data:'('+['ACK',nocolon(mac.mac),settings().hash,ssid,wifipass,mac.ip].join(';')+')'+"\r\n"
        });
        
        
    };
    
    var address2haddr = function(hwaddr,dev,type) {
        return deviceId + '-' + nocolon(hwaddr) + '-' + type+dev;
    };
    
    
    return {
        
        'set': function(data,delay,ctx) {
            
            if (typeof(data.value)=='undefined') data.value=toggle(data);
            
            return hset(data,delay,ctx);
        },
        
        'data': function(data) {
            if (!data.data) return;
            
            
            if (data.data.substr(0,1)=='(' && data.data.substr(-1)==')') {
                var line=data.data.substr(1,data.data.length-2).split(';');
                
                logger.log('Received: '+line.join(';'),'frame');
                
                if (line[pos_cmd]=='INIT') {
                    var address=nocolon(line[pos_src]);
                    var src=deviceId+'-'+address;
                    
                    var homekameleon = line[pos_inputs]>0;
                    
                    var b=database.buffer.get(src);
                    if (b==null) {
                        database.buffer.add({
                            hwaddr: src,
                            address: address,
                            ip: data.address,
                            inputs: line[pos_inputs],
                            outputs: line[pos_outputs],
                            active: false,
                            homekameleon: homekameleon
                        });
                    } else {
                        database.buffer.set({
                            hwaddr: src,
                            address: address,
                            ip: data.address,
                            inputs: line[pos_inputs],
                            outputs: line[pos_outputs],
                            homekameleon: homekameleon
                        });
                        if (b.active) initack(b);
                    }
                    
                } else {
                    var crc2=crc(line);
                    
                    if (crc2!=line[pos_crc]) {
                        console.log('Dupa, a nie CRC');
                    }
                    
                    if (line[pos_typ]=='A') {
                        var search = search_str(line,false);
                    
                        var origin={};
                        for (var i=0;i<sendQueue.length; i++) {
                            if (sendQueue[i].search==search && sendQueue[i].sent>0) {
                                sendQueue[i].count=attempts;
                                origin=sendQueue[i].cmd;
                                break;
                            }
                        }
                        
                        var state=line[pos_val];
                                
                        
                        if (typeof(origin.setval)!='undefined') {
                            state=origin.setval;
                        }
                        
                        
                        
                        var opt={haddr:address2haddr(line[pos_src],line[pos_dev],'o')};
                        if (state!=null) opt.value=state;
                      
                        if (opt.haddr!=null) callback('output',opt,origin.ctx||opt.haddr);   
                    }
                    
                }
                
            }
                     
        },
        'initstate': function (db) {
            database=db;
        },
        
        'dbready': function(db) {
            setTimeout(function() {
                outputs=db.ios.select([{device: deviceId, io: 'o', value: ['=',[1,'1']]}]);
            
                logger.log('Initializing outputs: '+outputs.recordsTotal,'init');
                
                for (var i in outputs.data) {
                    hset(outputs.data[i]);
                    logger.log(outputs.data[i].name+' ON','init');
                }
                
            },1000);
            
            db.buffer.trigger('active',initack);
            
        },
        
        'setId': function (id) {
            deviceId = id;
        },
        
        'ctrlz': function() {
            for (var i in sendQueue) {
                sendQueue[i].seconds2go = Math.round((sendQueue[i].when - Date.now())/1000);
            }
            console.log('HK:',sendQueue);
        },
        
        'cancel': function(ctx,delay) {
            setTimeout(function(){
                for (var i=0; i<sendQueue.length; i++) {
                    if (sendQueue[i].cmd.ctx==ctx) {
                        sendQueue.splice(i,1);
                        i--;
                    }
                }
                
            },delay*1000);
        }
    }
    
}
