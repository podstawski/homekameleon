
var limit=parseInt(local('limit'));
var url=local('url');
var urlm=url.match(/(http[s]*):\/\/([^@]+)@(.*)/);
var auth=null;
if (urlm) {
	auth=urlm[2].split(':');
	url=urlm[1]+'://'+urlm[3];
}

setLocal('last','Timeout problem with '+url);

$.ajax({
    url: url,
    method: 'GET',
    beforeSend: function( xhr ) {
        if (auth!==null)
            xhr.setRequestHeader('Authorization', 'Basic '+btoa(auth[0]+':'+auth[1])); 
    }
}).done(function(data){
	var result = JSON.parse(data);
	setLocal('last','OK');
	for (var k in result)
		if (result[k]>limit)
			setLocal('last',k+'(last)='+result[k]+'s');
    	setTimeout(exit,5);
    
});

