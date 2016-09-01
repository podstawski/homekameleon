var exec = require('child_process').execFile;
var fs = require('fs');
var path = require('path');

var instances=[];

var modelSaveTimer=null;

var saveModel=function(stop) {
    if(modelSaveTimer!=null) clearTimeout(modelSaveTimer);
    for (var k in instances) instances[k].save();
    if (stop==null) modelSaveTimer=setTimeout(saveModel,1000);
}

modelSaveTimer=setTimeout(saveModel,1000);



var Model = function(opt,logger) {
    var file=opt.file;
    var index=opt.index;
    var data=[];
    var lastSave=0;
    var lastSet=0;
    var saveState=false;
    instances[file]=this;
    self=this;
    var inited=false;
    var triggers={};
    
    if (logger==null) logger=console;
    
    var indexElement = function (ret) {
        
        if (ret!=null) if (typeof(ret)=='number' || ret.match(/^[0-9]+$/)) {
            var len=String(ret).length;
            var prefix='_';
            for (var i=0;i<16-len;i++) {
                prefix+='0';
            }
            ret=prefix+ret;
        }
        
        return ret;
    }
    
    var createIndex = function (data,ia) {
        if (ia==null) ia=index;
        
        if (typeof(data)=='object') {   
            var idx=[];
            for (var i=0;i<ia.length;i++) {
                var element='_';
                if (typeof(data[ia[i]])!='undefined') {
                    element=indexElement(data[ia[i]]);
                }
                idx.push(element);
            }
            return idx.join();
        } else {
            return indexElement(data);
        }
        
        
        
    };
    
    var getData=function() {
        var d=[];
        for (var k in data) d.push(data[k]);
        return d;        
    };
    
    this.save = function() {

        if (saveState) return;
        if (lastSave>lastSet) return;
        if (lastSet==0) return;
        
        saveState=true;
        
        
        var bak=path.dirname(file)+'/bak_'+path.basename(file);
        fs.renameSync(file, bak);
        fs.writeFileSync(file,JSON.stringify(getData()));
        
        try {
            var e=exec('fsync',[file],function(error,stdout,stderr){
                logger.log("Saved "+file,'db');
                fs.unlink(bak);
                lastSave=Date.now();
                saveState=false;        
            });
        } catch(e) {
            logger.log('fsync: '+e,'error');
            saveState=false;
            fs.unlink(bak);
        }
        
    
    }
    
    var open=function (d) {
        try {
            if (!d || d.length==0) {
                d='[]';
            }
            var json = JSON.parse(d);
            
            data={};
            for (var i=0;i<json.length;i++) {
                data[createIndex(json[i])] = json[i];
            }
            lastSave=Date.now();
        } catch (e) {
            logger.log('Data parse error in '+file+', '+e,'db');
        }
        
    };
    
    var compare = function (val1,val2,operator) {
        var cond=true;
        
        if (typeof(val1)=='object' && val1!=null) {
            for (var i=0; i<val1.length; i++) {
                if (compare(val1[i],val2,operator)) return true;
            }
            
            return false;
        }
        
        
        switch (operator) {
            case '<>':
            case '!=': {
                if (val1==val2) cond=false;
                break;
            }
            case '>': {
                if (val1>=val2) cond=false;
                break;     
            }
            case '<': {
                if (val1<=val2) cond=false;
                break;     
            }
            case '>=': {
                if (val1>val2) cond=false;
                break;     
            }
            case '<=': {
                if (val1<val2) cond=false;
                break;     
            }
            
            default: {
                if (val1!=val2) cond=false;
            }
        }
        
        return cond;
    }
    
    var condition = function (rec,where) {
        if (where==null) where=[{}];
        
        for (var i=0;i<where.length;i++) {
            var cond=true;
            for (var c in where[i]) {
                if (typeof(rec[c])=='undefined' && where[i][c]!=null) cond=false;
                if (typeof(where[i][c])=='object' && where[i][c]!=null) {
                    if (!compare(where[i][c][1],rec[c],where[i][c][0])) cond=false;
                } else {
                    if (!compare(where[i][c],rec[c],'=')) cond=false;
                }
            }
            if (cond) return true;
        }
        
        return false;
        
    }
    
    
    var max_element=function (element,where) {
        var max=0;
        for (var k in data) {
            if (!condition(data[k],where)) continue;
            if (typeof(data[k][element])!='undefined') if (data[k][element]>max) max=data[k][element];
        }
        return max;
    }
    
    
    var data_set = function(d,idx,cb) {
    
        if (typeof(idx)=='function') {
            cb=idx;
            idx=createIndex(d);
        }
        
        if (idx==null) {
            idx=createIndex(d);
        }
        
        if (typeof(data[idx])=='undefined') {
            return data_add(d,cb);
        }
        var anythingChanged=false;

        for (var k in d) {
            if (typeof(data[idx][k])=='undefined' || data[idx][k]!=d[k]) {
                data[idx][k]=d[k];
                if (triggers[k]!=null) {
                    for (var i=0;i<triggers[k].length;i++) {
                        triggers[k][i](data[idx]);
                    }
                }
                anythingChanged=true;
            }
            
        }
        
        if (anythingChanged) {
            data[idx]._updated=Date.now();
            lastSet=Date.now();
        }
        
        if (cb) cb(data[idx]);
        else return data[idx];
    };
    
    var data_add = function(d,cb) {
        idx=createIndex(d);
 
        if (idx=='_' && index.length==1) {
            d[index[0]]=parseInt(max_element(index[0]))+1;
            idx=createIndex(d);
        }
       
        if (idx.length==0 ) return;
        data[idx]={_updated:Date.now(),_created:Date.now()};

        for (var k in d) {
            data[idx][k]=d[k];
        }

        lastSet=Date.now();
        if (cb) cb(d);
        else return d;
    };
    
    var trigger = function(field,cb) {
        if (triggers[field]==null) triggers[field]=[];
        triggers[field].push(cb);
    };
    
    
    return {
        init: function (cb) {
            self.save();
            fs.readFile(file,function(error,d) {
                if (error) {
                    fs.readFile(file+'.bak',function(error,d) {
                        if (error) {
                            data={};
                            fs.closeSync(fs.openSync(file, 'w'));
                            inited=true;
                            if (cb) cb();
                        } else {
                            open(d);
                            inited=true;
                            if (cb) cb();
                        }
                    });
                } else {
                    logger.log("Opening "+file,'db');
                    open(d);
                    inited=true;
                    if (cb) cb();
                }
            });
            
        },
        
        getAll: function(cb) {
            var ret={recordsTotal:0,data:getData()};
            ret.recordsTotal=ret.data.length;
            if (cb!=null) cb(ret);
            else return ret;    
        },
        
        get: function(idx,cb) {
            idx=createIndex(idx);
            
            
            var ret=null;
            if (typeof(data[idx])!='undefined') ret=data[idx];
            
            
            if (cb) cb(ret);
            else return ret;
        },
        
        select: function (where,order,cb,ctx) {
            var ret={};
                        
            for (var k in data) {    
                if (condition(data[k],where)) {
                    var idx=createIndex(data[k],order);
                    if (typeof(ret[idx])=='undefined') ret[idx]=[]; 
                    ret[idx].push(data[k]);
                }
            }
            
            ret2=[];
            var keys=Object.keys(ret);
            keys.sort();
            for (i=0;i<keys.length;i++) {
                for (var j=0;j<ret[keys[i]].length;j++) {
                    ret2.push(ret[keys[i]][j]);
                }
            }
            
            var ret={recordsTotal:0,data:JSON.parse(JSON.stringify(ret2)),ctx:ctx};
            ret.recordsTotal=ret.data.length;
            
            
            if (cb) cb(ret);
            else return ret;            
            
        },
        
        set: function(d,idx,cb) {
            return data_set(d,idx,cb);    
        },
        
        count: function(where,cb) {
            var c=0;
            if (where) {
                for (var k in data) {    
                    if (condition(data[k],where)) {
                        c++;
                    }
                }
            } else {
                c=Object.keys(data).length
            }
            
            if (cb) cb(c)
            else return  c;
        },
        
        add: function(d,cb) {
            
            return data_add(d,cb);
            
        },
        
        remove: function (idx,cb) {
            idx=createIndex(idx);
            
            if (typeof(data[idx])!='undefined') {
                delete(data[idx]);
                lastSet=Date.now();
                if (cb) cb();
            }
        },
        
        index: function(data) {
            return createIndex(data);
        },
        
        max: function(element,where,cb) {
            var m=max_element(element,where);
            
            if (cb) cb(m);
            else return m;
        },
        
        ultimateSave: function () {
            logger.log('Ultimate save','db');
            saveModel(true);
        },
        
        inited: function () {
            return inited;
        },
        
        trigger: function(field,cb){
            return trigger(field,cb);
        }
 
        
    }
    
}



module.exports = Model;