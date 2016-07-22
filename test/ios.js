var model = require('../admin/models/json');

var opt={
	file: './ios.json',
	index: ["haddr"]
};


var ios=new model(opt,console);
ios.init(function(){
	outputs=ios.select([{device: 'HQP', io: 'o', value: ['=',[1,'1']]}]);

	
	console.log(outputs);

});
