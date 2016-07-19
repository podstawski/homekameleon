module.exports = function() {
    
    return {
        avg: function (a) {
            var total=0;count=0,str=null;
            
            for (var i=0; i<a.length; i++) {
                if (typeof(a[i])=='number') {
                    total+=a[i]; count++;
                } else if (!isNaN(parseFloat(a[i]))) {
                    total+=parseFloat(a[i]); count++;
                } else {
                    if (i==0) str=a[i];
                    else {
                        if (str!=a[i] ) str=null;
                    }
                }
            }
            
            if (count==0) return str;
            return total/count;
        }
    }
    
}