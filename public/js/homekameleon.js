jQuery.fn.selectText = function(){
    var doc = document;
    var element = this[0];
  
    if (doc.body.createTextRange) {
        var range = document.body.createTextRange();
        range.moveToElementText(element);
        range.select();
    } else if (window.getSelection) {
        var selection = window.getSelection();        
        var range = document.createRange();
        range.selectNodeContents(element);
        selection.removeAllRanges();
        selection.addRange(range);
    }
};



var websocket = io.connect();

websocket.on('cookie',function(cn,cv) {
    document.cookie=cn+'='+cv;
});



var lang='';
websocket.on('lang',function(lng,login){
    lang=lng;
    $.getScript( 'js/'+lang+'.js');
    

    if (login) {
        $('.loggedin').show();
        $('.loggedout').hide();
        $('.username').text('Admin');
    } else {
        $('.loggedin').hide();
        $('.loggedout').show();
        $('.username').text('Gość');      
    }
});

$(document).on('click','.logout a', function(){
    
    $('.loggedin').hide();
    $('.loggedout').show();
    $('.username').text('Guest');
    websocket.emit('logout');
    $('body').append('<iframe src="/logout"></iframe>');
    $('body').fadeOut(1000,function(){
        location.href='index.html';
    });
    
});




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
		
		$.smekta_file('views/script-select.html',{scripts:scripts},this,function(){
			select.val(id);
			select.select2();
		});
	});
}

var drawIOSelects = function(selection,ios,selected) {

	var obj;
	
	if (typeof(selection)=='object') {
		obj=selection.find('select.inputoroutput');
	} else if (typeof(selection)=='string') {
        obj=$(selection+' select.inputoroutput');
    }

	obj.each(function(){
		
		var id=$(this).attr('rel');
		var select=$(this);

		if (selected!=null) {
            var iosdata=JSON.parse(JSON.stringify(ios));
			for (var i=0; i<iosdata.length; i++) {
				if (selected.indexOf(iosdata[i].haddr)>=0) {
                    iosdata[i].selected=1;
                }
			}

        } else {
			var iosdata=ios;
		}
		
		$.smekta_file('views/inputoutput-select.html',{
			ios:iosdata,
			},this,function() {
				if (selected==null) select.val(id);
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
		html+='<option value="value" '+(cond[0]=='value'?'selected':'')+'>stan</option>';
		html+='<option value="time" '+(cond[0]=='time'?'selected':'')+'>czas</option>';
		html+='<option value="temp_change" '+(cond[0]=='temp_change'?'selected':'')+'>T: 1,-1</option>';
		
		
		
		html+='</select>';
		html+='<select class="cond_eq">';
		html+='<option value="=" '+(cond[1]=='='?'selected':'')+'>=</option>';
		html+='<option value=">" '+(cond[1]=='>'?'selected':'')+'>&gt;</option>';
		html+='<option value="<" '+(cond[1]=='<'?'selected':'')+'>&lt;</option>';
		html+='<option value="!=" '+(cond[1]=='!='?'selected':'')+'>!=</option>';
		
		html+='</select>';
		html+='<input type="text" size="1" value="'+cond[2]+'" class="cond_value" />';
		$(this).html(html);
	});
}


