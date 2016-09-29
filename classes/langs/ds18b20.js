

module.exports = function(com,ini,logger,callback) {
    var database,deviceId;
    var sem=0;
    
    var temperature = function () {
        var temps = database.ios.select([{device: deviceId, active: [true,1,'1']}]);

        
        for (var i=0;i<temps.data.length; i++) {
            com.query(temps.data[i].address);
            sem++;
        }
    }
    
    var address2haddrCache={};
    
    var address2haddr = function(adr) {
        var cond={device: deviceId, address: adr};

    
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
        
    return {
        'initstate': function (db) {
            database=db;
            setInterval(temperature,1000*60);
        },
 
        'set': function(data,delay,ctx) {
            setTimeout(function(){
                if (sem>0) {
                    setTimeout(this._onTimeout,100);
                    return;
                }
                console.log(data);
                com.discovery('ds18b20',function(d){
                    console.log(d);
                });
            },0);
		            
            
        },
        
        'data': function(data,ctx) {
          
            sem--;
            var haddr=address2haddr(data.address);
            if (data.value!=null && haddr!=null) callback('input',{haddr:haddr,value:Math.round(100*data.value)/100},ctx);
        },
        
        'cancel': function(ctx,delay) {
           
        },
        
        'setId': function (id) {
            deviceId = id;
        }
    }
    
}