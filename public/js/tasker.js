var vars = global('Homiq_variables');


var data = {
    p:global('Homiq_pass'),
    io: vars
};

var host=global('Homiq_host');
var hosta=host.split('@');
var auth=null;
if (hosta.length==2) {
    auth=hosta[0].split(':');
    host=hosta[1];
}
var url='http://'+host+'/read';


$.ajax({
    url: url,
    method: 'POST',
    data: data,
    beforeSend: function( xhr ) {
        if (auth!==null)
            xhr.setRequestHeader('Authorization', 'Basic '+btoa(auth[0]+':'+auth[1])); 
    }
}).done(function(data){
    var result=["PROG=30"];
    if (typeof(data)=='string')
        data=JSON.parse(data);

    vars=vars.split(',');
    for (var i=0; i<vars.length; i++ ) {
        var k=vars[i];
        if (k.indexOf(':')>0) {
            var _k=k.split(':');
            k=_k[0];
        }
        var postfix = '';
        if (typeof(data[k])=='undefined')
            continue;
        
        if (k==='idle') {
            postfix=' sek.';
            var orig=data[k];
            data[k]=parseFloat(data[k]);
            if (data[k]>60) {
                data[k]=Math.round(data[k]/60);
                postfix=' min.';
                if (data[k]>60) {
                    data[k]=Math.round(data[k]/60);
                    postfix=' godz.';
                    if (data[k]>24) {
                        data[k]=Math.round(data[k]/24);
                        postfix=' dni';
                    }
                }                
            }


            data[k]=data[k].toString()+postfix;
		//$.get('http://vc.webkameleon.com/tasker.php?o='+orig+'&n='+data[k]);
        }
        result.push(k+'='+data[k]);
        if (i%2==0) result.push( 'PROG='+Math.round(40+50*(i/vars.length)).toString() );
    }
    setGlobal("ZooperData",result.join('|'));
    //exit();
    setTimeout(exit,5);
    
});



