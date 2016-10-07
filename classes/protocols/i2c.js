var fs=require('fs');
var drivers_available=['ds2482'];

var util = require('util');
var EventEmitter = require('events').EventEmitter;

var I2C = function(options,logger) {
    var self=this;
    
    var drivers={};
    var intervals={};
    var queue=[],queryTimeout,queueSem=true;
    
    var runQueue = function() {
        
        if (queue.length>0 && queueSem) {
            queueSem=false;
            queue[0].driver.get(queue[0].address,function(data){
		
                if (typeof(queue[0])=='undefined') console.log('undefined queue',queue);
                
                queue[0].cb(data,queue[0].table,function() {
                    queue.splice(0,1);
                    queueSem=true;
                });
                
            });
        }
    
        queryTimeout=setTimeout(runQueue,500);
	
    }
    
    runQueue();
    
    var reggister = function(driver,address,freq,token,cb) {
        if (drivers[driver]==null) {
            var obj = require (__dirname+'/../drivers/_'+driver);
            drivers[driver] = new obj();
        }
    
        
        if (token==null) token=driver+','+address.join(',');
        
        setTimeout(function(addr,drv){
            intervals[token] = setInterval(function(addr,drv) {
                queue.push({driver:drv,address:addr,cb:cb,table:token});
            },1000*freq,addr,drv);
            
        },1000*freq*Math.random(),address,drivers[driver]);
        
        return token;
    };
    
    var discovery=function(bus_name,cb) {
        
        for (var i=0; i<drivers_available.length; i++) {
            var driver=drivers_available[i];
            if (drivers[driver]==null) {
                var obj = require (__dirname+'/../drivers/_'+driver);
                drivers[driver] = new obj();
            }
        }
        
        setTimeout(function(){
            if (!queueSem) {
                setTimeout(this._onTimeout,100);
                return;
            }
            queueSem=false;
            
            var result={bus:{},drivers:{}};
            
            try {
                require.resolve('mraa');
            } catch (e) {
                queueSem=true;
                cb(bus_name,result);
                return;
            }
            
            var mraa = require('mraa');
                    
            for (bus=0; bus<=7; bus++) {
                try {
                    fs.statSync('/dev/i2c-'+bus);
                    var i2c=new mraa.I2c(bus);
                    for (var i=1; i<128; i++) {
                        i2c.address(i);
                        var reg0=i2c.readReg(0x00);
                        if (reg0<255) {
                            if (result.bus[bus]==null) result.bus[bus]=[];
                            var dev={address:i,driver:null};
                            for (var k in drivers) {
                                if (drivers[k].addr()==i) dev.driver=k;
                            }
                            result.bus[bus].push(dev);
                        }
                    }                    
                } catch(e) {
	
                    
                }

            }
            
            var count=0;
            
            for (var k in drivers) {
                count++;
                drivers[k].discovery(k,result.bus,function(drv,vars){
                    result.drivers[drv]=vars;
                    count--;
                });
            }
            
            setTimeout(function() {
                if (count>0) {
                    setTimeout(this._onTimeout,100);
                    return;
                }
                queueSem=true;
                cb(bus_name,result);
            },0);
            
            
        },0);
    }
    
    return {

        discovery: discovery,
        
        connect: function() {
            logger.log('Initializing i2c','init');
            
            if (drivers[options.driver]==null) {
                var obj = require (__dirname+'/_'+options.driver);
                drivers[options.driver] = new obj();
                
                drivers[options.driver].init([options.bus,options.address],function(){
                    self.emit('connection');
                });
            }
            
            
            
        },
        
        query: function(address) {
            
            queue.push({
                driver: drivers[options.driver],
                address: [options.bus,options.address,address],
                cb: function(value,table,cb) {
			logger.log(table+': '+value,'frame');
                    self.emit('data',{address:address,value:value==null?null:parseFloat(value)});
                    cb();
                }
            });
            
        },
        
        disconnect: function() {
            drivers[options.driver]=null;
        },
        
        on: function(event,fun) {
            self.on(event,fun);
        },
        
        notify: function(type,data) {
            self.emit('notify',type,data);
        },
    }
}


util.inherits(I2C, EventEmitter);
module.exports = I2C;