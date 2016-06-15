var fs = require('fs');

module.exports = function(logdir) {
    var channels=null;
    var file={};
    var saveTimer=null;
    
    var spaces=function(s) {
        var ret='';
        for(i=0;i<s;i++) ret+=' ';
        return ret;
    }
    
    var save = function(stop) {
        
        if (saveTimer!=null) clearTimeout(saveTimer);
        
        for (f in file) {
            if (file[f].length) {
                fs.appendFileSync(logdir+'/'+f,file[f]);
                file[f]='';
            }
        }
        if (stop==null) saveTimer=setTimeout(save,1000);
        
    }
    
    
    var log=function(contents,type) {
        if (channels==null || channels==undefined || typeof(channels[type])=='undefined' || typeof(channels[type]['console'])=='undefined' || channels[type]['console']) {
            console.log('['+type+']'+spaces(10-type.length),contents);
        }
        
        if (channels==null || channels==undefined) return;
        
        if (typeof(channels[type])!='undefined' && typeof(channels[type]['file'])=='string' && channels[type]['file'].length>0) {
            var f=channels[type]['file'];
            if (typeof(file[f])=='undefined') file[f]='';
            var d=new Date().toString();
            var s='['+type+', '+d+']:'+spaces(55-d.length-type.length)+contents +"\n";
            file[f]+=s;
        }
        
            
    };
    
    
    return {
        log: function(contents,type) {
            if (type==null) type='notype';
            log(contents,type);
        },
        
        loadChannels: function(ch) {
            channels=ch;
            save();
        },
        
        save: function() {
            log('Ultimate log save','init');
            save(true);
        }
        
    }
}