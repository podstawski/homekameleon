var fs = require('fs');
var path = require('path');
var Model = require('./model');

module.exports = function (conf,logger) {
    var config_file=conf;
    var db={};
    
    return {
        get: function() {
            try {
                
                data=fs.readFileSync(config_file);
            } catch(e) {
                logger.log('File not found: '+config_file,'error');
                process.exit();
            }
            
            
            try {
                var json = JSON.parse(data);
            } catch (e) {
                logger.log('Structure parse error: '+e,'error');
                return null;
            }            
            
            if (typeof(json.db)!='undefined') {
                   
                for (var key in json.db) {    
                    try {
                        db[key] = new Model(path.dirname(config_file)+'/'+json.db[key].file,json.db[key].index,logger);
                        db[key].init();
                    } catch (e) {
                        logger.log('Error reading file '+json.db[key].file+' '+e,'error');
                        return null;
                    }                 
                }
            }
            
            return json;
        },
        db: db
        
    }
}




