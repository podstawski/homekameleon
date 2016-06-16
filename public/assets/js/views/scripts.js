/**
 * @author Piotr Podstawski <piotr@webkameleon.com>
 */



/*
 * columns definitions for DataTable
 */
var scriptsColumns=[
	{
		title: $.translate("Name"),
		data: "name",
		className: 'name'
	},
	{
		title: $.translate("Cond"),
		data: "conditions",
		sortable: false,
		render: function ( data, type, full, meta ) {
			return data.length;
		}
	},
	{
		title: $.translate("Act"),
		data: "actions",
		sortable: false,
		render: function ( data, type, full, meta ) {
			return data.length;
		}
	},
	{
		title: $.translate("SScr"),
		data: "scripts",
		sortable: false,
		render: function ( data, type, full, meta ) {
			return data.length;
		}
	},
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
		defaultContent: '<a class="btn btn-info" href="#"><i class="fa fa-edit" data-toggle="modal" data-target="#edit-script"></i></a> <a class="btn btn-danger" data-target="#confirm-delete" data-toggle="modal" href="#"><i class="fa fa-trash-o "></i></a>'
	}
];

var scriptsData={};
var scriptsDataArray=[];
var iosData={};
var iosDataArray=[];


/*
 *callingControl
 *after fireing control edit we need context - id
 */
var callingControl=null;

/*
 * function: scriptsTableDraw
 * called from websocket on data ready
 */
var scriptsTableDraw = function(data) {

	scriptsData={};

	var datatable = $('.scripttable').dataTable().api();

	for (var i=0; i<data.length;i++) {
		data[i].DT_RowId=data[i].id;
	
		for (var j=0; j<scriptsColumns.length; j++) {
			if (scriptsColumns[j].data==null) continue;
			
			if (typeof(data[i][scriptsColumns[j].data])=='undefined') {
                data[i][scriptsColumns[j].data]='';
            }
		}
		
		scriptsData[data[i].DT_RowId] = data[i];
		
	}
	
	scriptsDataArray=data;
	
	
	datatable.clear();
    datatable.rows.add(data);
    datatable.draw();
}



var loadScripts = function() {
	/*
	 *request to get all scripts
	 */
	websocket.emit('db-get','scripts');
	websocket.once('scripts-all', function(data) {
		scriptsTableDraw(data.data);
	});

}


var loadIOs = function() {
	/*
	 *request to get all ios
	 */
	websocket.emit('db-get','ios');
	websocket.once('ios-all', function(data) {
		iosDataArray=data.data;
		for (var i=0; i<iosDataArray.length; i++) {
            iosData[iosDataArray[i].haddr] = iosDataArray[i];
        }
	});

}



$(function(){
	
	/*
	 *DataTable init
	 */
	$('.scripttable').DataTable({
		language: {
			url: "assets/js/datatables/"+$.translateLang()+".json"
		},
		columns: scriptsColumns
	});

	/*
	 *set breadcrumbs path
	 */
	setBreadcrumbs([{name: $.translate('Scripts'), href:'scripts.html'}]);

	loadScripts();
	loadIOs();
	

	websocket.emit('db-get','scripts');
	websocket.once('scripts-all', function(data) {

		scriptsDataArray=data.data;
		for (var i=0; i<data.data.length; i++) {
			var idx=data.data[i].id;
			
			scriptsData[idx]=data.data[i];
			
		}
	});
	
	
	if (typeof($.scriptsInitiated)=='undefined') { //prevent multi event
	
		/*
		 *when delete button clicked in table list
		 *open confirm modal dialog
		 */
		$(document).on('click','.scripttable td a.btn-danger',function(e){
			var id=$(this).parent().parent().attr('id');
			$('#confirm-delete').attr('rel',id);
			$('#confirm-delete .modal-header h4').text(scriptsData[id].name);
		});
		
		/*
		 *when edit button clicked in table list
		 *open edit modal dialog
		 */
		$(document).on('click','.scripttable td a.btn-info',function(e){
			
			$('#edit-script').modal('show');
			
			var id=$(this).parent().parent().attr('id');
			$('#edit-script').attr('rel',id);
			$('#edit-script .modal-header h4 input').val(scriptsData[id].name);
			
			
			console.log(scriptsData[id]);
			$.smekta_file('views/smekta/script-actions.html',scriptsData[id],'#edit-script .modal-body',function(){
				
				$('#edit-script .modal-body .translate').translate();
				
				$('#edit-script .modal-body li').not('.add').append('<a class="x">×</a>');

				drawScriptSelects('#edit-script .modal-body .container-fluid .item',scriptsDataArray);
				drawIOSelects('#edit-script .modal-body .container-fluid .item',iosDataArray);
				drawConditions('#edit-script .modal-body .container-fluid .item');
			});

			
		

			
		});
		
		
		$(document).on('click','#edit-script .modal-body .plus-last',function(e){
			var newobj=$(this).parent().find('.new-item').last().clone();
			
			$(this).parent().find('.add').before(newobj);
			
			newobj.show().removeClass('new-item').addClass('item');
			
			drawScriptSelects(newobj,scriptsDataArray);
			drawIOSelects(newobj,iosDataArray);
			drawConditions(newobj);

		});
		
		
		$(document).on('click','#edit-script .modal-body li a.x', function(){
				$(this).parent().remove();
		});
		
		
		$(document).on('click','.scripttable .switch-success input', function() {

			var data={
				id: $(this).parent().parent().parent().attr('id'),
				active: $(this).prop('checked') 
			};
			websocket.emit('db-save','scripts',data);
		});
		
		
		
		$.scriptsInitiated=true;
    }
	
	/*
	 *remove confirmed
	 */
	$('#confirm-delete .btn-danger').click(function(e){
		$('#confirm-delete').modal('hide');
		console.log('Remove',$('#confirm-delete').attr('rel'));
		websocket.emit('db-remove','scripts',$('#confirm-delete').attr('rel'));
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
		
		
		
		$('#edit-script form .row').not('.new-row').find('.scripts li.item').each(function(){
			var s={
				script: $(this).find('select.scripts').val()
			};
			
			var delay=parseInt($(this).find('input.delay').val());
			if (!isNaN(delay) && delay>0) s.delay=delay;
			
			if (s.script.length>0) data.scripts.push(s);
		});
		
		
		
		//console.log(data);
		websocket.emit('db-save','scripts',data);
		
	});

	
	/*
	 *plus icon click - fire: add empty record
	 */
	$('.scripts .add-item').click(function(e) {
		websocket.emit('db-save','scripts',{});
	});	


});

