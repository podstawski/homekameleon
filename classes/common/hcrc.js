var fs = require('fs');

module.exports = function(str) {
    
    var c=0;
    for (var i=0; i<str.length; i++) {

        var ord=str.charCodeAt(i);
        var bit_counter = 8;
        
        while (bit_counter > 0 ) {
            
            var feedback_bit = (c ^ ord) & 0x01;
            if ( feedback_bit == 0x01 ) {
                c = c ^ 0x18;
            }
            c = (c >> 1) & 0x7F;
            if (feedback_bit == 0x01 ) {
                c = c | 0x80;
            }
            ord = ord >> 1;
            bit_counter--;

        }             
    }
    return c;    
}