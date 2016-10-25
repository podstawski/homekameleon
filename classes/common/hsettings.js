var fs = require('fs');
var exec = require('child_process').exec;

var _settings=null;

module.exports = function(s) {
    var dir=__dirname+'/../../conf';
    var file=dir+'/web.json';
    var wifi=dir+'/wifi';
    
    if (s) {
        if (!_settings) _settings=s;
        else for (var k in s) _settings[k]=s[k];
        
        fs.writeFileSync(file,JSON.stringify(_settings));
        /*
        try {
            var e=exec('fsync '+file);
        } catch(e) {
            
        }
        */
        
        if (s.ssid ) {
            fs.writeFileSync(wifi,_settings.ssid+' '+_settings.wifipass);
            
            try {
                var e=exec('fsync '+wifi);
                exec('reboot');
            } catch(e) {
            
            }
        } else if (!_settings.ssid) {
            try {
                fs.unlinkSync(wifi);
            } catch(e) {
                
            }
        }
    }
    
    if (!_settings) {
        try{
            var d = fs.readFileSync(file);
            _settings = JSON.parse(d);
        } catch(e) {
            _settings={};
        }
    }
    
    return _settings;
}