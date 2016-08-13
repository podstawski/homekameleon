var mraa = require('mraa');

var I2C = function(address,bus) {
	if (bus==null) bus=0;
	var i2c=new mraa.I2c(bus);
	i2c.address(address);


	var wb=function(b,d) {
		var buf=[b];
		
		if (d==null) {
			i2c.writeByte(b);
		} else {
			var rawBuffer = new Buffer(d.length * 2 + 1);

			rawBuffer[0]=b;
			for (var i=0; i<d.length; i++) {
				rawBuffer[i*2 + 1] = d[i];
				rawBuffer[i*2 + 2] = 0; 
			} 
			i2c.write(rawBuffer); 
		}

	}

	return {
		writeByte: function(b,cb) {
			try {
				//console.log('WRITE',b);
				wb(b);
				cb();
			} catch (e) {
				cb(e);	
			}
		},

		readByte: function(cb) {
			try {
				var d=i2c.read(1);
				//console.log('READ',d);
				cb(null,d[0]);
			} catch(e) {
				cb(e);
			} 

		},

		writeBytes: function(a,d,cb) {
			try {
				//console.log('WRITE',a,d);
				wb(a,d);
				cb();
			} catch(e) {
				cb(e);
			}
		}
	}

}


module.exports=I2C;
