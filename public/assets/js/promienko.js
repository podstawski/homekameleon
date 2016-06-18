/**
 * @author Piotr Podstawski <piotr@webkameleon.com>
 */



var drawScriptSelects = function(selection,scripts) {
	
	var obj;
	if (typeof(selection)=='object') {
		obj=selection.find('select.scripts');
	} else if (typeof(selection)=='string') {
        obj=$(selection+' select.scripts');
    }

	
	obj.each(function(){
		
		var id=$(this).attr('rel');
		var select=$(this);
		
		$.smekta_file('views/smekta/script-select.html',{scripts:scripts},this,function(){
			select.val(id);
			select.select2();
		});
	});
}

var drawIOSelects = function(selection,ios) {

	var obj;
	if (typeof(selection)=='object') {
		obj=selection.find('select.inputoroutput');
	} else if (typeof(selection)=='string') {
        obj=$(selection+' select.inputoroutput');
    }

	obj.each(function(){
		
		var id=$(this).attr('rel');
		var select=$(this);


		$.smekta_file('views/smekta/inputoutput-select.html',{
			ios:ios,
			},this,function() {
				select.val(id);
				select.select2();
		});
	});
}

var drawConditions = function (selection) {
	
	var obj;

	if (typeof(selection)=='object') {
		obj=selection.find('condition');
	} else if (typeof(selection)=='string') {
        obj=$(selection+' condition');
    }	
	
	
	obj.each(function(){
		
		var cond=$(this).text().split(',');
		if (cond.length==1) cond=['value','=',''];
		
		var html='<select class="cond_what">';
		html+='<option value="value" '+(cond[0]=='value'?'selected':'')+'>value</option>';
		html+='<option value="haddr" '+(cond[0]=='haddr'?'selected':'')+'>address</option>';
		html+='</select>';
		html+='<select class="cond_eq">';
		html+='<option value="=" '+(cond[1]=='='?'selected':'')+'>=</option>';
		html+='</select>';
		html+='<input type="text" size="1" value="'+cond[2]+'" class="cond_value" />';
		$(this).html(html);
	});
}

