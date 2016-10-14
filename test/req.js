var request = require('request');
var fs = require('fs');

    var flash = function(ip,file,u,cb) {
        var url='http://'+ip+'/'+u;

	var formData = {
		update: fs.createReadStream(file)
	};
	var formData2 = {
		update: fs.createReadStream(file)
	};

	url = {
		url: url,
		headers: {
			"Authorization": "Basic YWRtaW46NGQzMDA1OTE="
		}
	}

	url.formData=formData;


	//request.post({url:'http://www.gammanet.pl/alamakota',formData:formData2} , function (err, resp2, body) {

	//	console.log(err,resp2.request.headers['content-length']); 

	        var req = request.post(url , function (err, resp, body) {
        	    if (err) {
                	console.log('Error =',err,url);
            	    } else {
                	//console.log(resp.toJSON(),body);
			console.log(body);
            	    }
        	});	

		console.log(req.formData);
		
		req.headers['Content-Length']='271751';


	//});
    };
    



flash('192.168.0.11','../flash/hk.bin','firmware/');
//flash('192.168.0.44','../flash/hk.bin','firmware');
    
