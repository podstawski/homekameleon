
var tab=[];

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

                               
process.on('SIGTSTP',function(){     
	console.log('');
	var rec={hash:getRandomInt(0,9)+''};
	var max=10*1024;
	//max=2;
	for (var i=0; i<max; i++ ) rec.hash+='.'+getRandomInt(9999,100000);
	tab.push(rec);
});

process.on('SIGQUIT',function(){
        console.log('clear');
	tab.splice(getRandomInt(0,tab.length)-1,1);
	if (global.gc) global.gc();
	console.log('gc done');
});


var costam = function(){
	setTimeout(costam,1000);
	console.log('Tab elements:',tab.length,'Mem:',process.memoryUsage());
}

console.log('Use Ctrl-Z & Ctrl-\ to add/remove data from table');
if (!global.gc) console.log('No garbage collector, use --expose-gc option');
costam();
