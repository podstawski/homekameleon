var attempts=5;
var attempt_delay=1000;

var pos_cmd=0;
var pos_val=1;
var pos_src=2;
var pos_dst=3;
var pos_pkt=4;
var pos_top=5;
var pos_crc=6;




module.exports = function(com,logger,callback) {
    var counter=0;
    var sendQueue=[];
    var sendSemaphore=false;
    var buf='';
    var self=this;
    var sendTimers=[];

    
    var crc = function (cmd) {
        var str=cmd[pos_cmd]+cmd[pos_val]+cmd[pos_src]+cmd[pos_dst]+cmd[pos_pkt]+cmd[pos_top];
        var c=0;
        for (var i=0; i<str.length; i++) {

            var ord=str.charCodeAt(i);
            var bit_counter = 8;
            
            while (bit_counter > 0 ) {
                
                var feedback_bit = (c ^ ord) & 0x01;
                if ( feedback_bit == 0x01 ) {
                    c = c ^ 0x18;
                }
                c = (c >> 1) & 0x7F;
                if (feedback_bit == 0x01 ) {
                    c = c | 0x80;
                }
                ord = ord >> 1;
                bit_counter--;

            }             
        }
        return c;
    }
    
    var deletefuture = function (params) {
        for (var i=0; i<sendQueue.length; i++) {
            if (sendQueue[i].str.length>0) continue;
            
            var pass=true;
            for (var k in params) {
                if (params[k]!=sendQueue[i].cmd[k]) {
                    pass=false;
                    break;
                }
            }
            if (pass) {
                sendQueue.splice(i,1);
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
        if (cmd.length==2) callback('input',{address: line[pos_src]+'.'+cmd[1], state: line[pos_val]});
    }
    
    
    return {
        'turnon': function(options) {
            var adr=options['address'].split('.');
            var delay = typeof(options['delay'])=='undefined'?0:options['delay'];
            deletefuture({
                cmd: 'O.'+adr[1],
                dst: adr[0],
            });
            send({
                cmd: 'O.'+adr[1],
                dst: adr[0],
                val: 1
            },delay);
            
            
        },
        'turnoff': function(options) {
            var adr=options['address'].split('.');
            var delay = typeof(options['delay'])=='undefined'?0:options['delay'];
            deletefuture({
                cmd: 'O.'+adr[1],
                dst: adr[0],
            });
            send({
                cmd: 'O.'+adr[1],
                dst: adr[0],
                val: 0
            },delay);
        },
        'up': function(options) {
            var delay = typeof(options['delay'])=='undefined'?0:options['delay'];
            deletefuture({
                cmd: 'UD',
                dst: options['address'],
            });
            send({
                cmd: 'UD',
                dst: options['address'],
                val: 'u',
                setval: 'up'
            },delay);
        },
        'down': function(options) {
            var delay = typeof(options['delay'])=='undefined'?0:options['delay'];
            deletefuture({
                cmd: 'UD',
                dst: options['address'],
            });
            send({
                cmd: 'UD',
                dst: options['address'],
                val: 'd',
                setval: 'down'
            },delay);
        },
        'stop-u': function(options) {
            var delay = typeof(options['delay'])=='undefined'?0:options['delay'];
            deletefuture({
                cmd: 'UD',
                dst: options['address'],
            });
            send({
                cmd: 'UD',
                dst: options['address'],
                val: 's',
                setval: 'stop-u'
            },delay);
        },
        'stop-d': function(options) {
            var delay = typeof(options['delay'])=='undefined'?0:options['delay'];
            deletefuture({
                cmd: 'UD',
                dst: options['address'],
            });
            send({
                cmd: 'UD',
                dst: options['address'],
                val: 's',
                setval: 'stop-d'
            },delay);
        },
        'data': function(data) {
            buf+=data.trim();
            
            while (buf.indexOf(';>')>0) {
                var begin=buf.indexOf('<;');
                var end=buf.indexOf(';>');
                
                logger.log('Received: '+buf.substr(begin,end-begin+2),'frame');
                var line=buf.substr(begin+2,end-begin-2).split(';');
                buf=buf.substr(end+2);
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
                    var logicalstate='';
                    var state=line[pos_val];
                    if (line[pos_val]=='1') logicalstate='on';
                    if (line[pos_val]=='0') logicalstate='off';
                    if (line[pos_val]=='u') logicalstate='up';
                    if (line[pos_val]=='d') logicalstate='down';
                    
                    var cmd=line[pos_cmd].split('.');
                    var adr=line[pos_src];
                    if (cmd.length==2) adr+='.'+cmd[1];
                    
                    if (typeof(origin.setval)!='undefined') {
                        state=logicalstate=origin.setval;
                    }
                    
                    var opt={address:adr,state:state,logicalstate:logicalstate};
                    callback('output',opt);
                }
                
            }
            
            
        },
        'initstate': function (db) {
            setTimeout(hb,1000);
        }
    }
    
}