

module.exports = function(com,ini,logger,callback) {
    var database,deviceId;
    var sem=0;
    var avgs={};
    var tInterval=90000;
    
    var temperature = function () {
        var temps = database.ios.select([{device: deviceId, active: [true,1,'1']}]);

        
        for (var i=0;i<temps.data.length; i++) {
            setTimeout(function(a){
                com.query(temps.data[a].address);
                sem++;
            },i*(tInterval/(temps.data.length)),i);
            
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
        
    };

    var avg = function (a) {
        if (a.length==0) return 0;
        var total=0;
        for (var i=0; i< a.length; i++) total+=parseFloat(a[i]);
        return Math.round(100*total/a.length)/100;
    };
        
    return {
        'initstate': function (db) {
            database=db;
            setInterval(temperature,tInterval);
        },
 
        'set': function(data,delay,ctx) {
            setTimeout(function(){
                if (sem>0) {
                    setTimeout(this._onTimeout,100);
                    return;
                }
                com.discovery('ds18b20',function(name,d){
                    if(d.drivers.ds2482) {
                        for (var i=0; i<d.drivers.ds2482.length; i++) {
                            var sel=database.ios.select([{device: deviceId, address: d.drivers.ds2482[i]}]);
                            if (sel.recordsTotal==0) {
                                database.ios.add({
                                    haddr: deviceId+'-'+d.drivers.ds2482[i],
                                    active: true,
                                    device: deviceId,
                                    address: d.drivers.ds2482[i],
                                    io: 't',
                                    type: 'T'
                                });
                            }
                        }
        
                    }
                });
            },0);
		            
            
        },
        
        'data': function(data,ctx) {
            sem--;
            var haddr=address2haddr(data.address);
            if (!avgs[haddr]) avgs[haddr]=[];
            if (data.value!=null && !isNaN(data.value) && parseFloat(data.value)<85 )
                avgs[haddr].push(parseFloat(data.value));
            while (avgs[haddr].length>10) avgs[haddr].splice(0,1);
            
            if (data.value!=null && haddr!=null)
                callback('input',{haddr:haddr,value:Math.round(100*avg(avgs[haddr]))/100},ctx);
        },
        
        'cancel': function(ctx,delay) {
           
        },
        
        'setId': function (id) {
            deviceId = id;
        }
    }
    
}