var navReady = function () {
    $('.scripts').addClass('active');
};

$(window).on('resize', function () {
  if ($(window).width() > 768) $('#sidebar-collapse').collapse('show')
})
$(window).on('resize', function () {
  if ($(window).width() <= 767) $('#sidebar-collapse').collapse('hide')
})


var scriptsColumns=[
	{ title: "Nazwa",data: "name"},
    {
		title: 'Wykonaj',
        data: null,
		sortable: false,
		width: "7%",		
		render: function ( data, type, full, meta ) {
			return '<svg class="glyph stroked video"><use xlink:href="#stroked-video"/></svg>';
		}
	},
    {
		title: 'Zmień',
		orderable: false,
		data: null,
		width: "7%",
		defaultContent: '<svg class="glyph stroked gear"><use xlink:href="#stroked-gear"/></svg>'
	},
    {
		title: 'Usuń',
		orderable: false,
		data: null,
		width: "7%",
		defaultContent: '<svg class="glyph stroked trash"><use xlink:href="#stroked-trash"/></svg>'
	}
];


$('.scriptstable').DataTable({
    language: {
        url: "js/datatables/pl.json"
    },
    columns: scriptsColumns
});

var scriptsData,scriptsDataArray,iosDataArray,iosData={};

websocket.emit('ios');
websocket.on('ios',function(ios){
    iosDataArray=ios.data;
    for (var i=0;i<ios.data.length; i++) {
        iosData[ios.data[i].haddr]=ios.data[i];
    }
});

websocket.emit('scripts');

websocket.on('scripts',function(scripts){
    

    var data=scriptsDataArray=scripts.data;
    var datatable = $('.scriptstable').dataTable().api();
    scriptsData={};

	for (var i=0; i<data.length;i++) {
		data[i].DT_RowId=data[i].id;
        
		for (var j=0; j<scriptsColumns.length; j++) {
			if (scriptsColumns[j].data==null) continue;
			
			if (typeof(data[i][scriptsColumns[j].data])=='undefined') {
                data[i][scriptsColumns[j].data]='';
            }
		}
		
        scriptsData[data[i].id]=data[i];
        
	}
	
	datatable.clear();
    datatable.rows.add(data);
    datatable.draw();
});




$(document).on('click','.scriptstable svg',function(e){

    var id=$(this).closest('tr').attr('id');
    var scripts={};
    if (this.className.baseVal.indexOf('gear')>=0) {

        $('#edit-script').modal('show');
        var id=$(this).closest('tr').attr('id');
        $('#edit-script').attr('rel',id);
        $('#edit-script .modal-header h4 input').val($(this).closest('tr').first().text());
        
        
        //console.log(scriptsData[id]);
        $.smekta_file('views/script-actions.html',scriptsData[id],'#edit-script .modal-body',function(){
            
            $('#edit-script .modal-body li').not('.add').append('<a class="x">×</a>');

            drawScriptSelects('#edit-script .modal-body .container-fluid .item',scriptsDataArray);
            drawIOSelects('#edit-script .modal-body .container-fluid .item',iosDataArray);
            drawConditions('#edit-script .modal-body .container-fluid .item');
        });

    
    
    
    } else {
        
        scripts[id]=this.className.baseVal.indexOf('trash')<0;
        
        
        if (scripts[id]) {
            var scr=$(this);
            scr.fadeOut(500,function(){
                scr.fadeIn(500);
            });
            websocket.emit('scripts',scripts);
        } else {
            $('#confirm-delete h4').text($(this).closest('tr').children().first().text());
            $('#confirm-delete').attr('rel',id);
            $('#confirm-delete').modal('show');
            
        }
        
    }


});

$(document).on('click','#confirm-delete .btn-danger',function(e){
    scripts={};
    scripts[$('#confirm-delete').attr('rel')]=false
    websocket.emit('scripts',scripts);
    $('#confirm-delete').modal('hide');
});


$(document).on('click','#edit-script .modal-body .plus-last',function(e){
    var newobj=$(this).parent().find('.new-item').last().clone();
    
    $(this).parent().find('.add').before(newobj);
    
    newobj.show().removeClass('new-item').addClass('item');
    
    drawScriptSelects(newobj,scriptsDataArray);
    drawIOSelects(newobj,iosDataArray);
    drawConditions(newobj);

});


$(document).on('click','#edit-script .modal-body li a.x', function(e){
    $(this).parent().remove();
});

$(document).on('click','.add-script', function(e){
    websocket.emit('new-script');
    $("html, body").animate({ scrollTop: $('.scriptstable').offset().top-160 }, 1000);
});


/*
 *save button in input edit
 */
$('#edit-script .btn-info').click(function(e){
    $('#edit-script').modal('hide');
    var id=$('#edit-script').attr('rel');
    var data={'id':id};
    
    data.name=$('#edit-script input[name="name"]').val();
    
    var sa=$('#edit-script form').serializeArray();
    for(var i=0;i <sa.length; i++) {
        data[sa[i].name] = sa[i].value;
    }

    data.conditions=[];
    data.actions=[];
    data.nactions=[];
    data.scripts=[];
    
    $('#edit-script form .row').not('.new-row').find('.conditions li.item').each(function(){
        var cond={};

        cond.haddr=$(this).find('select.inputoroutput').val();

        cond.condition=[
            $(this).find('.cond_what').val(),
            $(this).find('.cond_eq').val(),
            $(this).find('.cond_value').val()
        ];
        
        data.conditions.push(cond);
    });
    
    $('#edit-script form .row').not('.new-row').find('.actions li.item').each(function(){
        var a={
            haddr: $(this).find('select.inputoroutput').val()
        };
        
        a.device=iosData[a.haddr].device;
        a.address=iosData[a.haddr].address;
        a.value=$(this).find('input.value').val();
        
        var delay=parseInt($(this).find('input.delay').val());
        if (!isNaN(delay) && delay>0) a.delay=delay;
        
        data.actions.push(a);
    });
    
    $('#edit-script form .row').not('.new-row').find('.nactions li.item').each(function(){
        var a={
            haddr: $(this).find('select.inputoroutput').val()
        };
        
        a.device=iosData[a.haddr].device;
        a.address=iosData[a.haddr].address;
        a.value=$(this).find('input.value').val();
        
        var delay=parseInt($(this).find('input.delay').val());
        if (!isNaN(delay) && delay>0) a.delay=delay;
        
        data.nactions.push(a);
    });
    
    
    $('#edit-script form .row').not('.new-row').find('.scripts li.item').each(function(){
        var s={
            script: $(this).find('select.scripts').val()
        };
        
        var delay=parseInt($(this).find('input.delay').val());
        if (!isNaN(delay) && delay>0) s.delay=delay;
        
        if (s.script.length>0) data.scripts.push(s);
    });
    
    
    

    var id=data['id'];
    var scr={};
    scr[id]=data;
    websocket.emit('scripts',scr);
    
});

