var exec = require('child_process').execFile;
var util = require('util');
var EventEmitter = require('events').EventEmitter;


var Shell = function(options,logger) {
    var self=this;

    return {
        connect: function() {
            logger.log('Shell initialized','init');
            self.emit('connection');
        },
        
        disconnect: function() {
        },
        
        on: function(event,fun) {
            self.on(event,fun);
        },
        
        notify: function(type,data) {
            self.emit('notify',type,data);
        },
        
        send: function(data,ctx) {
          
            var cmd=data.address;
            var cmd_args=data.value.split(' ');
            
            try {
                var e=exec(cmd,cmd_args,function (error, stdout, stderr) {
			logger.log(cmd+' '+data.value+(error?' FAIL':' OK'),'shell-exec');
                    if (!error) {
                        if (stdout.length>0) data.value=stdout;
                        self.emit('data',data,ctx);
                    } else {
				logger.log(error,'shell-exec');
			}
                });   
            } catch(e) {
                logger.log(e,'shell-exec');
            }

            
        }
        
    }


}



util.inherits(Shell, EventEmitter);
module.exports = Shell;