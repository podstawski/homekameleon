module.exports=function() {
    
    return {
        get: function(a,cb) {
            if (typeof(cb)=='function') cb(null);
        },

        init: function(a,cb) {
            if (typeof(cb)=='function') cb(null);
        },
        
        addr: function() {
            return 0;
        },
        
        discovery: function(drv,bus,cb) {
            cb(drv,[null]);
        }
    }
    
}