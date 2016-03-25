var fs = require('fs');

var instances=[];


var Model = function(file,index,logger) {
    var data=[];
    var lastSave=0;
    var lastSet=0;
    var saveState=false;
    instances[file]=this;
    
    var createIndex = function (data) {
        var idx=[];
        for (var i=0;i<index.length;i++) {
            idx.push(data[index[i]]);
        }
        return idx.join();
    }
    
    this.save = function() {
        if (saveState) return;
        if (lastSave>=lastSet) return;
        saveState=true;
        
        var d=[];
        for (var k in data) d.push(data[k]);
        
        var bak=file+'.bak';
        fs.renameSync(file, bak);
        fs.writeFile(file,JSON.stringify(d),function() {
            logger.log("Saved "+file,'db');
            fs.unlink(bak);
            lastSave=Date.now();
            saveState=false;
        });
    }
    
    
    return {
        init: function () {
            
            fs.readFile(file,function(error,d) {
                if (error) {
                    d=fs.readFileSync(file+'.bak');
                }
                logger.log("Opening "+file,'db');
                try {
                    var json = JSON.parse(d);
                    
                    data=[];
                    for (var i=0;i<json.length;i++) {
                        data[createIndex(json[i])] = json[i];
                    }
                    lastSave=Date.now();
                } catch (e) {
                    logger.log('Data parse error in '+file+', '+e,'db');
                }  
            });
            
        },
        
        getAll: function() {
            return data;    
        },
        
        get: function(idx) {
            if (typeof(idx)=='object') {
                idx=createIndex(idx);
            }
            if (typeof(data[idx])=='undefined') return null;
            
            return data[idx];
        },
        
        set: function(d,idx) {
            if (idx==null) {
                idx=createIndex(d);
            }
            
            if (typeof(data[idx])=='undefined') {
                logger.log("Index "+idx+" could not be found",'error');
                return;
            }
            var anythingChanged=false;
            
            for (var k in d) {
                if (typeof(data[idx][k])=='undefined' || data[idx][k]!=d[k]) {
                    data[idx][k]=d[k];
                    anythingChanged=true;
                }
                
            }
            
            if (anythingChanged) lastSet=Date.now();
        },
        
        index: function(data) {
            return createIndex(data);
        }
        
    }
    
}

var saveModel=function() {
    for (var k in instances) instances[k].save();
    setTimeout(saveModel,1000);
}

setTimeout(saveModel,1000);

module.exports = Model;