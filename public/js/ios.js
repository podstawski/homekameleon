var navReady = function () {
    $('.ios').addClass('active');
};

$(window).on('resize', function () {
  if ($(window).width() > 768) $('#sidebar-collapse').collapse('show')
})
$(window).on('resize', function () {
  if ($(window).width() <= 767) $('#sidebar-collapse').collapse('hide')
})


var iosColumns=[
	{ title: "Nazwa",data: "name"},
    { title: "Urządzenie",data: "device"},
    { title: "Adres",data: "address"}, 
    {
	title: 'Stan<span class="hidden-xs"><br/>obecny/poprzedni/czas</span>',
		data: "value",
		sortable: false,
		width: "10%",		
		render: function ( data, type, full, meta ) {

			t=(Date.now()-full.last)/1000;
			if (t>3600) t=Math.round(t/3600)+'h';
			else if (t>600) t=Math.round(t/60)+'m';
			else t=Math.round(t)+'s';
			let state='<span class="hidden-xs"><br/>'+full.value+'/'+(full.lastValue||'?')+'/'+t+'</span>';

			if (data==1 || data==0) {
                		var cl=data==1?' on':'';
                		return '<svg class="glyph stroked flag'+cl+'"><use xlink:href="#stroked-flag"/></svg>'+state;
            		} else {
                		return data+' '+(full.unit?full.unit:'')+state;  
            		}
            
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


$('.iostable').DataTable({
    language: {
        url: "js/datatables/pl.json"
    },
    columns: iosColumns
});


var io_input_toggle = function () {
	if ($('#edit-input .modal-body #io').val().toLowerCase()=='t') {
		$('#edit-input .modal-body .temps').fadeIn(1000);
	} else {
		$('#edit-input .modal-body .temps').fadeOut(1000);
	}
}


var scriptsData={},scriptsDataArray,iosDataArray,iosData={};

websocket.emit('scripts');
websocket.on('scripts',function(scripts){
    scriptsDataArray=scripts.data;
    
    for (var i=0; i<scriptsDataArray.length; i++)
        scriptsData[scriptsDataArray[i].id]=scriptsDataArray[i];
});

websocket.emit('ios-device');

websocket.on('ios-device',function(d) {
    for (var k in d) {
        $('.ios-add').append('<button type="button" class="btn btn-info" rel="'+k+'"> + '+d[k]+'</button>');
    }
});

websocket.emit('ios');
websocket.on('ios',function(ios){
    

    var data=iosDataArray=ios.data;
    var datatable = $('.iostable').dataTable().api();

	for (var i=0; i<data.length;i++) {
		data[i].DT_RowId=data[i].haddr;
	
		for (var j=0; j<iosColumns.length; j++) {
			if (iosColumns[j].data==null) continue;
			
			if (typeof(data[i][iosColumns[j].data])=='undefined') {
                data[i][iosColumns[j].data]='';
            }
		}
        iosData[data[i].haddr]=data[i];
        
		
	}
	
	datatable.clear();
    datatable.rows.add(data);
    datatable.draw();
});




$(document).on('click','.iostable svg',function(e){

    var id=$(this).closest('tr').attr('id');
    var ios={};
    if (this.className.baseVal.indexOf('gear')>=0) {

        $('#edit-input').modal('show');
        
        var id=$(this).closest('tr').attr('id');
        $('#edit-input').attr('rel',id);
        $('#edit-input .modal-header h4 input').val(iosData[id].name);
        
        websocket.emit('actions',id);
        websocket.once('actions',function(actions) {
            /*
             *draw edit body
             */
            if (actions==null) {
                actions={};
            }
            
            if (actions.actions==null) {
                actions.actions=[];
            }
            
            var data=iosData[id];
            data.id=id;
            data.actions=actions.actions;

            
            $.smekta_file('views/input-actions.html',data,'#edit-input .modal-body',function(){
                

                $('#edit-input .modal-body li').not('.add').append('<a class="x">×</a>');

                drawScriptSelects('#edit-input .modal-body .container-fluid .item',scriptsDataArray);
                drawIOSelects('#edit-input .modal-body .container-fluid .item',iosDataArray);
                
                drawIOSelects('#edit-input .modal-body .related',iosDataArray,data.related||[]);
                
                drawConditions('#edit-input .modal-body .container-fluid .item');
                setTimeout(io_input_toggle,500);
                $('#edit-input select.value:not([value=""])').each(function(){
                    $(this).val($(this).attr('value'));
                });
            
            });

            
        });

    
    } else {
        ios[id]=this.className.baseVal.indexOf('trash')<0;
     
        
        if (ios[id]) {
            var me=$(this);
            var d={};
            d[id]=true;
            websocket.emit('ios',d);
            me.fadeOut(500,function(){
                me.fadeIn(500);
            });
        } else {
            
            $('#confirm-delete h4').text($(this).closest('tr').children().first().text());
            $('#confirm-delete').attr('rel',id);
            $('#confirm-delete').modal('show');
        }
        
    }


});

$(document).on('click','#confirm-delete .btn-danger',function(e){
    ios={};
    ios[$('#confirm-delete').attr('rel')]=false
    websocket.emit('ios',ios);
    $('#confirm-delete').modal('hide');
});


$(document).on('click','#edit-input .modal-body .plus-action',function(e){
    
    $('#edit-input .modal-body .new-row').clone().appendTo('#edit-input .modal-body .container-fluid').show();
    
    drawScriptSelects('#edit-input .modal-body .container-fluid .new-row .item',scriptsDataArray);
    drawIOSelects('#edit-input .modal-body .container-fluid .new-row .item',iosDataArray);
    drawConditions('#edit-input .modal-body .container-fluid .new-row .item');
    
    $('#edit-input .modal-body .container-fluid .new-row').removeClass('new-row');
});

$(document).on('click','#edit-input .modal-body .plus-last',function(e){
    var newobj=$(this).parent().find('.new-item').last().clone();
    
    $(this).parent().find('.add').before(newobj);
    
    newobj.show().removeClass('new-item').addClass('item');
    
    drawScriptSelects(newobj,scriptsDataArray);
    drawIOSelects(newobj,iosDataArray);
    drawConditions(newobj);

});


$(document).on('click','#edit-input .modal-body li a.x', function(){
        $(this).parent().remove();
});

$(document).on('change','#edit-input .modal-body #io', io_input_toggle);


$('#edit-input .btn-info').click(function(e){
    $('#edit-input').modal('hide');
    var id=$('#edit-input').attr('rel');
    var data={'haddr':id};
    
    data.name=$('#edit-input input[name="name"]').val();
    
    var sa=$('#edit-input form').serializeArray();
    

    for(var i=0;i <sa.length; i++) {
        data[sa[i].name] = sa[i].value;
    }
    data.related=$('#edit-input form .related select').val();
    

    var iosdata={};
    iosdata[id]=data;
    
    websocket.emit('ios',iosdata);
    
    var data={'haddr':id};
    
    var actions=[];
    $('#edit-input form .row').not('.new-row').each(function(){
        var a={};
        a.active=$(this).find('.switch-success input').prop('checked');
        
        a.conditions=[];
        $(this).find('.conditions li.item').each(function(){
            var cond={};

            cond.haddr=$(this).find('select.inputoroutput').val();

            cond.condition=[
                $(this).find('.cond_what').val(),
                $(this).find('.cond_eq').val(),
                $(this).find('.cond_value').val()
            ];
            
            a.conditions.push(cond);
        });
        
        a.scripts=[];
        
        $(this).find('.scripts li.item').each(function(){
            var s={
                script: $(this).find('select.scripts').val()
            };
            var delay=parseInt($(this).find('input.delay').val());
            if (!isNaN(delay) && delay>0) s.delay=delay;
            
            if (s.script.length>0) a.scripts.push(s);
        });
        

        if (a.scripts.length>0) actions.push(a);
        
    });
    
    
    
    data.actions=actions;
    
    websocket.emit('actions',data);
    
});

$(document).on('click','.ios-add button', function(){
    websocket.emit('ios-device',{device:$(this).attr('rel'),name:$('.dataTables_filter input').val()});
    $("html, body").animate({ scrollTop: $('.iostable').offset().top-160 }, 1000);    
});
