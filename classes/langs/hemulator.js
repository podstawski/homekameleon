var attempts=5;
var attempt_delay=1000;

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
    var deviceId;
    var backsocket=null;

    
    
    var crc = function (cmd) {
        var str=cmd[pos_cmd]+cmd[pos_val]+cmd[pos_src]+cmd[pos_dst]+cmd[pos_pkt]+cmd[pos_top];
        return hcrc(str);
    }
    
    
    var pkt = function() {
        counter=(counter%255)+1;
        return counter;
    }
    
    var backport = function(port) {
        if (backsocket!=null) return;
        
        var tcpd=require('../protocols/tcpd');
        var backdoor=new tcpd({port:port},logger);
        logger.log('Initializing emulator backdoor on port '+port,'init');
        backdoor.connect();
        backdoor.on('connection',function(s){
            backsocket=s;
            setTimeout(function(){
                backdoor.send('Hello, this is EMU backdoor, type h for help\n');
            },500);
            
        });
        
        backdoor.on('data',function(data) {
            var cmd=data.substr(0,1);
            data=data.substr(1).trim();
            
            switch (cmd) {
                case 'h':
                    backdoor.send(' h: print this message\n');
                    backdoor.send(' q: quit\n');
                    backdoor.send(' r: reset emulator\n');
                    backdoor.send(' s: send CMD,VAL,ADR\n');
                    backdoor.send('\n');
                    break;
                
                case 'q':
                    backdoor.send('see you\n');
                    backdoor.disconnect();
                    
                    break;
                case 'r':
                    com.disconnect();
                    break;
                
                case 's':
                    var s=data.split(/[ ,]+/);
                    
                    var str=send({cmd: s[0],val: s[1], adr: s[2]})
                    backdoor.send(str+'\n\n');
                    break;
                
                default:
                    backdoor.send('unknown command '+cmd+'\n');
            }
            
        });
    }
    
    var send = function(cmd) {

    
        var arr=new Array;
         
        arr[pos_cmd]=cmd.cmd;
        arr[pos_val]=cmd.val;
        arr[pos_dst]='0';
        arr[pos_src]=cmd.adr;
        arr[pos_pkt]=pkt();
        arr[pos_top]='s';
        arr[pos_crc]=crc(arr);
         
        var str='<;'+arr.join(';')+';>';

        com.send(str+'\n');
        
        return str;
    }
    
    
        
    var linein = function (line) {
        var cmd=line[pos_cmd].split('.');
        
        if (typeof(self['cmd_'+cmd[0]])=='function') {
            self['cmd_'+cmd[0]](line);
        }
    }
    
    self.cmd_O = function (line) {
        var cmd=line[pos_cmd].split('.');
        logger.log('EMU swiches '+(line[pos_val]=='1'?'on':'off')+' '+line[pos_dst]+'.'+cmd[1],'emulator');
    }
    
    
    return {
        'data': function(data) {
            buf+=data.trim();
            
            while (buf.indexOf(';>')>0) {
                var begin=buf.indexOf('<;');
                var end=buf.indexOf(';>');
                
                logger.log('EMU received: '+buf.substr(begin,end-begin+2),'emulator');
                var line=buf.substr(begin+2,end-begin-2).split(';');
                buf=buf.substr(end+2);
                if (line[pos_top]=='s' && line[pos_cmd]!='HB') {
                    var ack=line.slice(0);
                    ack[pos_top]='a';
                    ack[pos_dst]=line[pos_src];
                    ack[pos_src]=line[pos_dst];
                    ack[pos_crc]=crc(ack);
                    var cmd='<;'+ack.join(';')+';>';
                    
                    linein(line);
                    logger.log('EMU is sending ack: '+cmd,'frame');
                    com.send(cmd+"\r\n");
                        
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
                    
                
                }
                
            }
            
            
        },
        'initstate': function (db) {
           
        },
        'request': function(socket) {
            
        },
        
        'setId': function (id) {
            deviceId = id;
            for (var i=0; i<ini.devices.length;i++) {
                if (ini.devices[i].id==id && ini.devices[i].com.backport!=null) {
                    backport(ini.devices[i].com.backport);
                }
            }
        },
    }
    
}