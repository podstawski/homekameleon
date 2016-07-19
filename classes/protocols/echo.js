var util = require('util');
var EventEmitter = require('events').EventEmitter;

var Echo = function(options,logger) {
    var self=this;
    
    return {
        connect: function() {
            logger.log('Echo server initialized','init');
            self.emit('connection');
        },
        
        disconnect: function() {
        },
        
        on: function(event,fun) {
            self.on(event,fun);
        },
        
        send: function(str) {
            self.emit('data',str);
        },
        
        notify: function(type,data) {
            self.emit('notify',type,data);
    
        }
    }
}

util.inherits(Echo, EventEmitter);
module.exports = Echo;
