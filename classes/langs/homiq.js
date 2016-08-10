var attempts=8;
var attempt_delay=500;

var pos_cmd=0;
var pos_val=1;
var pos_src=2;
var pos_dst=3;
var pos_pkt=4;
var pos_top=5;
var pos_crc=6;

var hcrc = require('../common/hcrc');


module.exports = function(com,ini,logger,callback) {
    var counter=0;
    var sendQueue=[];
    var sendSemaphore=false;
    var buf='';
    var self=this;
    var sendTimers=[];
    var database;
    var deviceId;

    
    var crc = function (cmd) {
        var str=cmd[pos_cmd]+cmd[pos_val]+cmd[pos_src]+cmd[pos_dst]+cmd[pos_pkt]+cmd[pos_top];
        return hcrc(str);
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
        
    }
    
    var pkt = function() {
        counter=(counter%255)+1;
        return counter;
    }
    
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
            
            if (sendQueue[i].str.length==0) {
                var arr=new Array;
                
                arr[pos_cmd]=sendQueue[i].cmd.cmd;
                arr[pos_val]=sendQueue[i].cmd.val;
                arr[pos_src]='0';
                arr[pos_dst]=sendQueue[i].cmd.dst;
                arr[pos_pkt]=pkt();
                arr[pos_top]='s';
                arr[pos_crc]=crc(arr);
                
                sendQueue[i].str='<;'+arr.join(';')+';>';
                sendQueue[i].search = arr[pos_cmd]+':'+arr[pos_dst]+':'+arr[pos_pkt];
            }
                
            var msg=sendQueue[i].str;
            var res=com.send(msg+"\r\n");
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
        
        sendSemaphore=false;
        if (sendQueue.length>0) sendTimers.push(setTimeout(send,nextHop));
        
    }
    
    
    
    var hb=function() {
        var line=[];
        line[pos_cmd]='HB';
        line[pos_val]='1';
        line[pos_top]='s';
        line[pos_dst]='yy';
        line[pos_src]='0';
        line[pos_pkt]=pkt();
        line[pos_crc]=crc(line);
        var cmd='<;'+line.join(';')+';>';
        logger.log('Sending line: '+cmd,'frame');
        com.send(cmd+"\r\n");
        
        setTimeout(hb,18000);
    }
    
    var linein = function (line) {
        var cmd=line[pos_cmd].split('.');
        
        if (typeof(self['cmd_'+cmd[0]])=='function') {
            self['cmd_'+cmd[0]](line);
        }
    }
    
    self.cmd_I = function (line) {
        var cmd=line[pos_cmd].split('.');
        var haddr=address2haddr(line[pos_src]+'.'+cmd[1],'i');
        if (cmd.length==2) callback('input',{haddr: haddr, value: line[pos_val]},haddr);
    }
    
    var address2haddrCache={};
    
    var address2haddr = function(adr,ioo) {
        var cond={device: deviceId, address: adr};
        if (ioo!=null) cond.io=ioo;
    
        var token=JSON.stringify(cond);
        if (typeof(address2haddrCache[token])!='undefined') {
            return address2haddrCache[token];
        }
        var rec=database.ios.select([cond]);
        if (rec!=null && rec.recordsTotal==1) {
            
            address2haddrCache[token]=rec.data[0].haddr;
            return address2haddrCache[token];
        }
        return null;
        
    }
    
    var haddr2address = function(haddr) {
        var obj=database.ios.get(haddr);
        if (obj!=null) return obj.address;
    
        return null;
    }
    
    var hset = function(data,delay2,ctx) {
        var address=haddr2address(data.haddr);
        if (address==null) return;
        var value=data.value;
        var delay = typeof(data.delay)=='undefined' ? 0 : data.delay;
        
        delay+=delay2||0;

        
        switch (value) {
            case 'stop-d':
            case 'stop-u':
            case 'down':
            case 'up':
                if (delay==0) deletefuture({cmd: 'UD',dst: address});
                val='s';
                if (value=='up') val='u';
                if (value=='down') val='d';
                send({
                    cmd: 'UD',
                    dst: address,
                    val: val,
                    setval: value,
                    ctx: ctx
                },delay);
                break;
            
            default:
                var adr=address.split('.');
                
                if (!isNaN(parseFloat(value)) && adr.length==2) {
                    
                    if (delay==0) {
                        deletefuture({
                            cmd: 'O.'+adr[1],
                            dst: adr[0],
                        });
                    }
                    
                    send({
                        cmd: 'O.'+adr[1],
                        dst: adr[0],
                        val: value,
                        ctx: ctx
                    },delay); 
                }
                
                break;
                
        }
        
        
    };
    
    var toggle = function(data) {
        var rec=database.ios.get(data);
        
    
        if (isNaN(parseFloat(rec.value))) {
            
            switch (rec.value) {
                case 'up':
                    return 'stop-u';
                    
                case 'down':
                    return 'stop-d';
            
                case 'stop-u':
                    return 'down';

                case 'stop-d':
                    return 'up';
            }
            
            
        } else {
            if (parseInt(rec.value)==0 || parseInt(rec.value)==1) {
                return parseInt(rec.value)==0?1:0;
            }
        }
        
        return rec.value;
    };
    
    var t0 = function () {
        var temps = database.ios.select([{device: deviceId, type: 'T.0', active: [true,1,'1']}]);
        
        for (var i=0;i<temps.data.length; i++) {
            send({
                    cmd: 'T.0',
                    dst: temps.data[i].address,
                    val: 0
            });
        }
    }
    
    return {
        
        'set': function(data,delay,ctx) {
            
            if (typeof(data.value)=='undefined') data.value=toggle(data);
            
            return hset(data,delay,ctx);
        },
        
        'data': function(data) {
            buf+=data.trim();
            
            while (buf.indexOf(';>')>0) {
                var begin=buf.indexOf('<;');
                var end=buf.indexOf(';>');
                
                logger.log('Received: '+buf.substr(begin,end-begin+2),'frame');
                
                var line=buf.substr(begin+2,end-begin-2).split(';');
                buf=buf.substr(end+2);
                
                if (line[pos_cmd]!='PG' && parseInt(line[pos_crc])!=crc(line)) {
                    logger.log('CRC error','error');
                    continue;
                }
                
                if (line[pos_top]=='s') {
                    var ack=line.slice(0);
                    ack[pos_top]='a';
                    ack[pos_dst]=line[pos_src];
                    ack[pos_src]=line[pos_dst];
                    ack[pos_crc]=crc(ack);
                    var cmd='<;'+ack.join(';')+';>';
                    logger.log('Sending ack: '+cmd,'frame');
                    com.send(cmd+"\r\n");
                    
                    linein(line);    
                }
                
                if (line[pos_top]=='a') {
                    var search = line[pos_cmd]+':'+line[pos_src]+':'+line[pos_pkt];
                
                    var origin={};
                    for (var i=0;i<sendQueue.length; i++) {
                        if (sendQueue[i].search==search && sendQueue[i].sent>0) {
                            sendQueue[i].count=attempts;
                            origin=sendQueue[i].cmd;
                            break;
                        }
                    }
                    
                    var state=line[pos_val];
             
                    var cmd=line[pos_cmd].split('.');
                    var adr=line[pos_src];
                    if (cmd.length==2) adr+='.'+cmd[1];
                    
                    
                    
                    if (typeof(origin.setval)!='undefined') {
                        state=origin.setval;
                    }
                    
                    var io=(cmd.length==2)?'o':null;
                    
                    if (line[pos_cmd]=='T.0') {
                        io=null;
                        var v=(state+'').split('.');
                        if (v[1].length==1) v[1]='0'+v[1];
                        state=parseFloat(v[0]+'.'+v[1]);
                    }
                    
                    var opt={haddr:address2haddr(adr,io)};
                    if (state!=null) opt.value=state;
                  
                    if (opt.haddr!=null) callback('output',opt,origin.ctx||opt.haddr);
                }
                
            }
            
            
        },
        'initstate': function (db) {
            setTimeout(hb,1000);
            database=db;
            setInterval(t0,1000*60);
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
            db.ios.trigger('type',function(data){
                if (data.device!=deviceId) return;
                
                var address=data.address.split('.');
                if (address.length!=2) return;
                
                if (data.io=='i' && (data.type=='0' || data.type=='1')) {
                    send({
                        cmd: 'IM.'+address[1],
                        dst: address[0],
                        val: data.type,
                        setval: null
                    });
                }
                
                if (data.io=='o' && (data.type=='0' || data.type=='1') ) {
                    send({
                        cmd: 'IOM.'+address[1],
                        dst: address[0],
                        val: data.type,
                        setval: null
                    });
                }
                
                
            });
        },
        
        'setId': function (id) {
            deviceId = id;
        },
        
        'ctrlz': function() {
            for (var i in sendQueue) {
                sendQueue[i].seconds2go = Math.round((sendQueue[i].when - Date.now())/1000);
            }
            console.log('Homiq:',sendQueue);
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