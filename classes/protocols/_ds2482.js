
try {
    require.resolve('ds2482');
    var I2c = require('./_i2c');
    var DS2482 = require('ds2482');
    
    
    module.exports = function () {
    
        var wires={};
        var wire;
        
        var tempFromBuffer = function(data) {
            LowByte = data[0];
            HighByte = data[1];
        
            TReading = (HighByte << 8) + LowByte;
            SignBit = TReading & 0x8000;  // test most sig bit
            if (SignBit) { // negative
                TReading = (TReading ^ 0xffff) + 1; // 2's comp
            }
            return TReading/16;
            
        }
    
        
        var error=function(token,e,cb) {
            console.log('DS2482 error',e);
            wires[token]=null;
            setTimeout(function(){
                cb(null);
            },1000);
            return null;
        };
        
        var discovery = function (bus,cb) {
            for (var b in bus) {
                for (var i=0; i<bus[b].length; i++) {
                    if (bus[b][i].driver=='ds2482') {
                        var i2c=new I2c(bus[b][i].address,parseInt(b));    
                        var wire = new DS2482({i2c:i2c}); 
                        wire.search(function(err, roms) {
                            if (!err) cb(roms);
                            else cb(null);
                        });
                    }
                }
    
            }
        };
        
        var init=function(address,cb,dont_call_cb_of_success) {
            var token='ds2482,'+address[0]+','+address[1];
            try {
                console.log('DS2482 init',address);
                var i2c=new I2c(address[1],address[0]);
                wire = new DS2482({i2c:i2c});;
                wires[token] = wire;
                if (typeof(cb)=='function' && !dont_call_cb_of_success) cb();
                return wire;
                
            } catch (e) {          
                return error(token,e,cb);
            }          
        }
    
        var get = function(address,cb) {
            var token='ds2482,'+address[0]+','+address[1];
            
            wire = wires[token] ? wires[token] : init(address,cb,true);
            
            if (!wire) retrun;
            
            try {
                var rom=address[2];
                if (rom.substr(0,2)=='28') { //temperature meter
    
                    wire.sendCommand(0x44,rom,function(e,d) {
                        if (e) return error(token,e,cb);
                        else {
                            setTimeout(function(){
                                wire.sendCommand(0xBE,rom,function(e,d) {
                                    if (e) return error(token,e,cb);
                                    else {
                                        setTimeout(function() {
                                            wire.readData(9,function(e,d){
                                                if (e) return error(token,e,cb);
                                                else {
                                                    if (!DS2482.checkCRC(d)) {
                                                        cb(null);
                                                        return;
                                                    }
                                                    var t=tempFromBuffer(d);
                                                    if (t>=85 || t<-100) cb(null);
                                                    else cb(t);
                                                }
                                            });
                                        },200);
                                    }
                                });
                            },500);
                        }
                    });	
                
                
                }
            } catch (e) {
                return error(token,e,cb);
            }
        
            
        };
        
        return {
            get: function(address,cb) {
                get(address,cb);
            },
            
            init: function(address,cb) {
                init(address,cb);
            },
            
            addr: function() {
                return 24;
            },
            
            discovery: function(drv,bus,cb) {
                discovery(bus,function(vars){
                    cb(drv,vars);
                });
                
            }
        }
    
    }
} catch (e) {
    module.exports = require('./null');

}