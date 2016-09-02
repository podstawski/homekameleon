var b=new Buffer('promienko'); 

console.log(b);


var hex2str=function(hex) {
	if (typeof(hex)!='string') return hex;
	if (hex.substr(0,2).toLowerCase()!='0x') return hex;

	hex=hex.substr(2);
	var b=new Buffer(hex.length/2);
	for (var i=0; i<hex.length/2; i++){
		b[i]=parseInt('0x'+hex.substr(i*2,2));
	}
	return b.toString('utf-8');
}


var ssid='0x67F372616C65';
console.log('/sbin/ap_client','ra0','apcli0',hex2str(ssid),'asyouwish','mediatek:orange:wifi');

