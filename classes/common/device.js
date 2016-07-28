var util = require('util');
var EventEmitter = require('events').EventEmitter;


var Device = function(id,protocol,language,options,ini,logger) {
    var self=this;
    
    var Protocol = require(__dirname+'/../protocols/'+protocol);
    var Translator = require(__dirname+'/../langs/'+language);
    

    var com=new Protocol(options,logger);
    var trans=new Translator(com,ini,logger,function(type,data,ctx) {
        //console.log('device',id,ctx);
        self.emit('data',id,type,data,ctx);
        
    });
    
    if (typeof(com.setLanguage)=='function') {
        com.setLanguage(trans);
    }
    
    com.on('data',function(data) {
        trans.data(data);
    });
    
    com.on('request',function(request,response) {
        trans.request(request,response);
    });
    
    com.on('connection',function(data) {
        self.emit('connection',id,data);
    });
  
    
    return {
        disconnect: function () {
            com.disconnect();
        },
        
        connect: function () {
            com.connect();
        },
        
        on: function(event,fun) {
            self.on(event,fun);
        },
        
        command: function(data,delay,ctx) {
            if (typeof(trans.set)=='function') trans.set(data,delay,ctx);
        },
        
        initstate: function(socket,db) {
            if (typeof(trans.setId)=='function') trans.setId(id);
            if (typeof(com.initstate)=='function') com.initstate(socket,db);
            if (typeof(trans.initstate)=='function') trans.initstate(db);
            
        },
        
        cancel: function(ctx,delay) {
            if (typeof(trans.cancel)=='function') trans.cancel(ctx,delay);
        },
        
        notify: function(type,data) {
            if (typeof(com.notify)=='function') com.notify(type,data);
        },
        
        ctrlz: function() {
            if (typeof(com.ctrlz)=='function') com.ctrlz();
            if (typeof(trans.ctrlz)=='function') trans.ctrlz();       
        },
        
        dbready: function(db) {
            if (typeof(trans.dbready)=='function') trans.dbready(db);
        }
    }
}

util.inherits(Device, EventEmitter);
module.exports = Device;
