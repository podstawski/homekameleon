var vars = global('Homiq_variables');

var data = {
    p:global('Homiq_pass'),
    e:1,
    io: vars
};


var url='http://'+global('Homiq_host')+'/read';
$.post(url,data,function(data){
    var result=["PROG=30"];
    if (typeof(data)=='string')
        data=JSON.parse(data);

    vars=vars.split(',');
    for (var i=0; i<vars.length; i++ ) {
        var k=vars[i];
        var postfix = '';
        
        if (k=='idle' && data[k]) {
            postfix=' sek.';
            if (parseFloat(data[k])>60) {
                data[k]=Math.round(parseFloat(data[k])/60);
                postfix=' min.';
            }
            if (parseFloat(data[k])>60) {
                data[k]=Math.round(parseFloat(data[k])/60);
                postfix=' godz.';
            }
            if (parseFloat(data[k])>24) {
                data[k]=Math.round(parseFloat(data[k])/24);
                postfix=' dni';
            }
            data[k]=data[k].toString()+postfix;
        }
        if (data[k]) result.push(k+'='+data[k]);
        result.push( 'PROG='+Math.round(40+50*(i/vars.length)).toString() );
    }
    setGlobal("ZooperData",result.join('|'));
    exit();
    
});



