var request = require('request');
var fs = require('fs');

    var flash = function(ip,file,u,cb) {
        var url='http://'+ip+'/'+u;

	var formData = {
		update: fs.createReadStream(file)
	};

	url = {
		url: url,
		headers: {
			"Authorization": "Basic YWRtaW46NGQzMDA1OTE="
		}
	}

	url.formData=formData;


	request.post('http://127.0.0.1/alamakota' , function (err, resp, body) {

		console.log(err,resp); 

	        var req = request.post(url , function (err, resp, body) {
        	    if (err) {
                	console.log('Error =',err,url);
            	    } else {
                	console.log(resp.toJSON());
            	    }
        	});	
		
		//req.headers['Content-Length']='271772';

                console.log(req.headers);
                console.log(req.formData);

	});

    };
    



//flash('192.168.0.11','../flash/hk.bin','firmware/');
flash('192.168.0.44','../flash/hk.bin','firmware');
    
