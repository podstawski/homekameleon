var fs = require('fs');

module.exports = function(logdir) {
    var logs=null;
    var dir=logdir;
    
    return {
        log: function(contents,type) {
            console.log(contents);
            
        }
    }
}