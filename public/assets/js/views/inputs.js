/**
 * @author Piotr Podstawski <piotr@webkameleon.com>
 */



/*
 * columns definitions for DataTable
 */
var iosColumns=[
	{
		title: $.translate("Name"),
		data: "name",
		className: 'name',
		xxxrender: function ( data, type, full, meta) {
			return '<input type="text" value="'+data+'"/>'
		}
	},
	{ title: $.translate("H-address"), data: "haddr" },
	{ title: $.translate("Address"), data: "address" },
	{ title: $.translate("Type"), data: "type" },
    
    {
		title: $.translate("Active"),
		data: "active",
		sortable: false,
		render: function ( data, type, full, meta ) {
			var ch=data==1?'checked':'';
			
			return '<label class="switch switch-default switch-success"><input type="checkbox" class="switch-input" '+ch+'><span class="switch-label"></span><span class="switch-handle"></span></label>';
		}
	},
    {
		title: $.translate("Actions"),
		orderable: false,
		data: null,
		defaultContent: '<a class="btn btn-info" href="#"><i class="fa fa-edit" data-toggle="modal" data-target="#edit-input"></i></a> <a class="btn btn-danger" data-target="#confirm-delete" data-toggle="modal" href="#"><i class="fa fa-trash-o "></i></a>'
	}
];

var iosData={};

var scriptsData={};

var iosDataArray=[];
var scriptsDataArray=[];
var iosoutputsDataArray=[];

/*
 *callingControl
 *after fireing control edit we need context - id
 */
var callingControl=null;

/*
 * function: iosTableDraw
 * called from websocket on data ready
 */
var iosTableDraw = function(data) {

	iosData={};

	var datatable = $('.inputtable').dataTable().api();

	for (var i=0; i<data.length;i++) {
		data[i].DT_RowId=data[i].haddr;
	
		for (var j=0; j<iosColumns.length; j++) {
			if (iosColumns[j].data==null) continue;
			
			if (typeof(data[i][iosColumns[j].data])=='undefined') {
                data[i][iosColumns[j].data]='';
            }
		}
		
		iosData[data[i].DT_RowId] = data[i];
		
		data[i].id=data[i].haddr;
	}
	
	iosDataArray=data;
	
	
	datatable.clear();
    datatable.rows.add(data);
    datatable.draw();
}


var loadIOs = function() {
	/*
	 *request to get all ios
	 */
	websocket.emit('db-get','ios');
	websocket.once('ios-all', function(data) {
		iosTableDraw(data.data);
	});

}


$(function(){
	
	/*
	 *DataTable init
	 */
	$('.inputtable').DataTable({
		language: {
			url: "assets/js/datatables/"+$.translateLang()+".json"
		},
		columns: iosColumns
	});

	/*
	 *set breadcrumbs path
	 */
	setBreadcrumbs([{name: $.translate('Inputs & outputs'), href:'inputs.html'}]);

	loadIOs();		
	

	websocket.emit('db-get','scripts');
	websocket.once('scripts-all', function(data) {

		scriptsDataArray=data.data;
		for (var i=0; i<data.data.length; i++) {
			var idx=data.data[i].id;
			
			scriptsData[idx]=data.data[i];
			
		}
	});
	
	
	if (typeof($.iosInitiated)=='undefined') { //prevent multi event
	
		/*
		 *when delete button clicked in table list
		 *open confirm modal dialog
		 */
		$(document).on('click','.inputtable td a.btn-danger',function(e){
			var id=$(this).parent().parent().attr('id');
			$('#confirm-delete').attr('rel',id);
			$('#confirm-delete .modal-header h4').text(iosData[id].name);
		});
		
		/*
		 *when edit button clicked in table list
		 *open edit modal dialog
		 */
		$(document).on('click','.inputtable td a.btn-info',function(e){
			
			$('#edit-input').modal('show');
			
			var id=$(this).parent().parent().attr('id');
			$('#edit-input').attr('rel',id);
			$('#edit-input .modal-header h4 input').val(iosData[id].name);
			
			websocket.emit('db-get','actions',id);
			websocket.once('actions',function(actions) {
				/*
				 *draw edit body
				 */
				
				if (actions.actions===undefined) {
                    actions.actions=[];
                }
				
				var data=iosData[id];
				data.id=id;
				data.actions=actions.actions;
				
				console.log(data);
				$.smekta_file('views/smekta/input-actions.html',data,'#edit-input .modal-body',function(){
					
					$('#edit-input .modal-body .translate').translate();
					
					$('#edit-input .modal-body li').not('.add').append('<a class="x">×</a>');

					drawScriptSelects('#edit-input .modal-body .container-fluid .item',scriptsDataArray);
					drawIOSelects('#edit-input .modal-body .container-fluid .item',iosDataArray);
					drawConditions('#edit-input .modal-body .container-fluid .item');
				});

				
			});
			

			
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
		
		
		$(document).on('click','.inputtable .switch-success input', function() {

			var data={
				haddr: $(this).parent().parent().parent().attr('id'),
				active: $(this).prop('checked') 
			};
			websocket.emit('db-save','ios',data,'haddr');
		});
		
		
		
		$.iosInitiated=true;
    }
	
	/*
	 *remove confirmed
	 */
	$('#confirm-delete .btn-danger').click(function(e){
		$('#confirm-delete').modal('hide');
		console.log('Remove',$('#confirm-delete').attr('rel'));
		websocket.emit('db-remove','ios',$('#confirm-delete').attr('rel'));
	});

	/*
	 *save button in input edit
	 */
	$('#edit-input .btn-info').click(function(e){
		$('#edit-input').modal('hide');
		var id=$('#edit-input').attr('rel');
		var data={'haddr':id};
		
		data.name=$('#edit-input input[name="name"]').val();
		
		var sa=$('#edit-input form').serializeArray();
		for(var i=0;i <sa.length; i++) {
			data[sa[i].name] = sa[i].value;
		}

		websocket.emit('db-save','ios',data,'haddr');
		
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
		
		websocket.emit('db-save','actions',data,'haddr');
		
	});

	/*
	 *upload new image icon clicked and user chose image
	 */
	$('#img-input').on('change',function(){
		var d=$('#img-input').prop('files')[0];
		if (typeof(d)!='undefined') {
			var file_reader = new FileReader();
			file_reader.readAsDataURL(d);
			
			file_reader.onload = function() {
				websocket.emit('upload-file',$('#edit-control').attr('symbol'),file_reader.result);
				
			};
		}
	
	
	});
	
	/*
	 *plus icon click - fire: add empty record
	 */
	$('.inputs .add-item').click(function(e) {
		websocket.emit('db-save','ios',{'haddr':'_new','io':'o'},'haddr');
	});	


});

