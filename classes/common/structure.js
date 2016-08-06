var fs = require('fs');
var path = require('path');
var models={};



module.exports = function (conf,logger) {
    var config_file=conf;
    var db={};
    
    return {
        get: function(cb) {
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
            
            if (typeof(json.lang)!='undefined') {
                try {
                    var lang_file_name=path.dirname(config_file)+'/'+json.lang+'.json';
                    var lang=fs.readFileSync(lang_file_name);
                    json.dictionary = JSON.parse(lang);
                    
                    if (typeof(json.dictionary.synonyms)!='undefined') {
                        var synonyms={};
                        for (var i=0; i<json.dictionary.synonyms.length; i++) {
                            for (var j=0;j<json.dictionary.synonyms[i].length;j++) {
                                var a=JSON.parse(JSON.stringify(json.dictionary.synonyms[i]));
                                a.splice(a.indexOf(json.dictionary.synonyms[i][j]),1);
                                synonyms[json.dictionary.synonyms[i][j]] = a;
                            }
                        }
                        json.dictionary.synonyms=synonyms;
                    }
                    
                } catch (e) {
                    logger.log('Problem with file '+lang_file_name+': '+e,'error');
                    
                }              
            }
            
            if (typeof(json.db)!='undefined') {
                var jsons=0;
                for (var key in json.db) {    
                    jsons++;
                    try {
                        var model=json.db[key].model || './model';
             
                        if (typeof(models[model])=='undefined') {
                            models[model]=require(model);
                        }
                        if (typeof(json.db[key].file)!='undefined' && json.db[key].file.indexOf('/')<0) {
                            json.db[key].file=path.dirname(config_file)+'/'+json.db[key].file;
                        }
                  
                        db[key] = new models[model](json.db[key],logger);
                        db[key].init(function() {
                            jsons--;
                            if (jsons==0 && typeof(cb)=='function') cb();
                        });
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




