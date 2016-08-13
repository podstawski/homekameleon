

module.exports = function(com,ini,logger,callback) {
    var database,deviceId;
    
    var temperature = function () {
        var temps = database.ios.select([{device: deviceId, active: [true,1,'1']}]);

        
        for (var i=0;i<temps.data.length; i++) {
            com.query(temps.data[i].address);
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
            setInterval(temperature,1000*6);
        },
 
        'set': function(data,delay,ctx) {
            
        },
        
        'data': function(data,ctx) {
          
            var haddr=address2haddr(data.address);
            console.log(data,haddr);
            if (data.value!=null && haddr!=null) callback('input',{haddr:haddr,value:data.value},ctx);
        },
        
        'cancel': function(ctx,delay) {
           
        },
        
        'setId': function (id) {
            deviceId = id;
        }
    }
    
}