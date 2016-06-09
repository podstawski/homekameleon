/**
 * @author Piotr Podstawski <piotr@webkameleon.com>
 */



/*
 * columns definitions for DataTable
 */
var inputsColumns=[
	{
		title: $.translate("Name"),
		data: "name",
		className: 'name',
		xxxrender: function ( data, type, full, meta) {
			return '<input type="text" value="'+data+'"/>'
		}
	},
    { title: $.translate("Device"), data: "device" },
	{ title: $.translate("Address"), data: "address" },
    {
		title: $.translate("Type") ,
		data: "type",
		sortable: false,
		render: function ( data, type, full, meta ) {
			var ch=data==1?'checked':'';
			return '<label class="switch switch-icon switch-pill switch-secondary-outline"><input type="checkbox" class="switch-input" '+ch+'><span class="switch-label" data-on="" data-off=""></span><span class="switch-handle"></span></label>';
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
		defaultContent: '<a class="btn btn-info" href="#"><i class="fa fa-edit" data-toggle="modal" data-target="#edit-input"></i></a> <a class="btn btn-danger" data-target="#confirm-delete" data-toggle="modal" href="#"><i class="fa fa-trash-o "></i></a>'
	}
];

var inputsData={};
var outputsData={};
var scriptsData={};

var inputsDataArray=[];
var outputsDataArray=[];
var scriptsDataArray=[];
var inputsoutputsDataArray=[];

/*
 *callingControl
 *after fireing control edit we need context - id
 */
var callingControl=null;

/*
 * function: inputsTableDraw
 * called from websocket on data ready
 */
var inputsTableDraw = function(data) {

	inputsData={};

	var datatable = $('.inputtable').dataTable().api();

	for (var i=0; i<data.length;i++) {
		data[i].DT_RowId=data[i].device+','+data[i].address;
	
		for (var j=0; j<inputsColumns.length; j++) {
			if (inputsColumns[j].data==null) continue;
			
			if (typeof(data[i][inputsColumns[j].data])=='undefined') {
                data[i][inputsColumns[j].data]='';
            }
		}
		
		inputsData[data[i].DT_RowId] = data[i];
		
		data[i].id='inputs,'+data[i].device+','+data[i].address;
	}
	
	inputsDataArray=data;
	
	
	datatable.clear();
    datatable.rows.add(data);
    datatable.draw();
}


var drawScriptSelects = function(selection) {
	
	var obj;
	if (typeof(selection)=='object') {
		obj=selection.find('select.scripts');
	} else if (typeof(selection)=='string') {
        obj=$(selection+' select.scripts');
    }

	
	obj.each(function(){
		
		var id=$(this).attr('rel');
		var select=$(this);
		
		$.smekta_file('views/smekta/script-select.html',{scripts:scriptsDataArray},this,function(){
			select.val(id);
			select.select2();
		});
	});
}

var drawIOSelects = function(selection) {

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
			inputs:inputsDataArray,
			outputs:outputsDataArray
			},this,function(){
			
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
		if (cond.length==1) cond=['state','=',''];
		
		var html='<select class="cond_what" name="cond_what">';
		html+='<option value="state" '+(cond[0]=='state'?'selected':'')+'>state</option>';
		html+='<option value="logicalstate" '+(cond[0]=='logicalstate'?'selected':'')+'>Lstate</option>';
		html+='</select>';
		html+='<select class="cond_eq" name="cond_eq">';
		html+='<option value="=" '+(cond[1]=='='?'selected':'')+'>=</option>';
		html+='</select>';
		html+='<input type="text" size="1" value="'+cond[2]+'" class="cond_value" name="cond_value"/>';
		$(this).html(html);
	});
}

var loadInputs = function() {
	/*
	 *request to get all inputs
	 */
	websocket.emit('db-get','inputs');
	websocket.once('inputs-all', function(data) {
		inputsTableDraw(data.data);
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
		columns: inputsColumns
	});

	/*
	 *set breadcrumbs path
	 */
	setBreadcrumbs([{name: $.translate('Inputs'), href:'inputs.html'}]);

	loadInputs();		
	
	websocket.emit('db-get','outputs');
	websocket.once('outputs-all', function(data) {
		
		
		for (var i=0; i<data.data.length; i++) {
			var idx=data.data[i].device+','+data.data[i].address;
			
			outputsData[idx]=data.data[i];
			data.data[i].id='outputs,'+idx;
		}
		
		outputsDataArray=data.data;
	});

	websocket.emit('db-get','scripts');
	websocket.once('scripts-all', function(data) {

		scriptsDataArray=data.data;
		for (var i=0; i<data.data.length; i++) {
			var idx=data.data[i].id;
			
			scriptsData[idx]=data.data[i];
			
		}
	});
	
	
	if (typeof($.inputsInitiated)=='undefined') { //prevent multi event
	
		/*
		 *when delete button clicked in table list
		 *open confirm modal dialog
		 */
		$(document).on('click','.inputtable td a.btn-danger',function(e){
			var id=$(this).parent().parent().attr('id');
			$('#confirm-delete').attr('rel',id);
			$('#confirm-delete .modal-header h4').text(inputsData[id].name);
		});
		
		/*
		 *when edit button clicked in table list
		 *open edit modal dialog
		 */
		$(document).on('click','.inputtable td a.btn-info',function(e){
			
			$('#edit-input').modal('show');
			
			var id=$(this).parent().parent().attr('id');
			$('#edit-input').attr('rel',id);
			$('#edit-input .modal-header h4 input').val(inputsData[id].name);
			
			websocket.emit('db-get','actions',id);
			websocket.once('actions',function(actions) {
				/*
				 *draw edit body
				 */
				
				if (actions.actions===undefined) {
                    actions.actions=[];
                }
				actions.id=id;
				console.log(actions);
				$.smekta_file('views/smekta/input-actions.html',actions,'#edit-input .modal-body',function(){
					
					$('#edit-input .modal-body .translate').translate();
					
					$('#edit-input .modal-body li').not('.add').append('<a class="x">×</a>');

					drawScriptSelects('#edit-input .modal-body .container-fluid .item');
					drawIOSelects('#edit-input .modal-body .container-fluid .item');
					drawConditions('#edit-input .modal-body .container-fluid .item');
				});

				
			});
			

			
		});
		
		$(document).on('click','#edit-input .modal-body .plus-action',function(e){
			
			$('#edit-input .modal-body .new-row').clone().appendTo('#edit-input .modal-body .container-fluid').show();
			
			drawScriptSelects('#edit-input .modal-body .container-fluid .new-row .item');
			drawIOSelects('#edit-input .modal-body .container-fluid .new-row .item');
			drawConditions('#edit-input .modal-body .container-fluid .new-row .item');
			
			$('#edit-input .modal-body .container-fluid .new-row').removeClass('new-row');
		});
		
		$(document).on('click','#edit-input .modal-body .plus-last',function(e){
			var newobj=$(this).parent().find('.new-item').last().clone();
			
			$(this).parent().find('.add').before(newobj);
			
			newobj.show().removeClass('new-item').addClass('item');
			
			drawScriptSelects(newobj);
			drawIOSelects(newobj);
			drawConditions(newobj);

		});
		
		
		$(document).on('click','#edit-input .modal-body li a.x', function(){
				$(this).parent().remove();
		});
		
		
		$(document).on('click','.inputtable .switch-success input', function() {
			var id=$(this).parent().parent().parent().attr('id').split(',');
			var data={
				device: id[0],
				address: id[1],
				active: $(this).prop('checked') 
			};
			websocket.emit('db-save','inputs',data,'address');
		});
		
		$(document).on('click','.inputtable .switch-pill input', function() {
			var id=$(this).parent().parent().parent().attr('id').split(',');
			var data={
				device: id[0],
				address: id[1],
				type: $(this).prop('checked')?1:0 
			};
			websocket.emit('db-save','inputs',data,'address');
		});
		
		
		
		$.inputsInitiated=true;
    }
	
	/*
	 *remove confirmed
	 */
	$('#confirm-delete .btn-danger').click(function(e){
		$('#confirm-delete').modal('hide');
		console.log('Remove',$('#confirm-delete').attr('rel'));
		websocket.emit('db-remove','inputs',$('#confirm-delete').attr('rel'));
	});

	/*
	 *save button in input edit
	 */
	$('#edit-input .btn-info').click(function(e){
		$('#edit-input').modal('hide');
		var id=$('#edit-input').attr('rel').split(',');
		var data={
			device: id[0],
			address: id[1]
		}
		
		data.name=$('#edit-input input[name="name"]').val();
		websocket.emit('db-save','inputs',data,'address');
		
		data={
			device: id[0],
			address: id[1]
		};
		
		var actions=[];
		$('#edit-input form .row').not('.new-row').each(function(){
			var a={};
			a.active=$(this).find('.switch-success input').prop('checked');
			
			a.conditions=[];
			$(this).find('.conditions li.item').each(function(){
				var cond={};

				var id=$(this).find('select.inputoroutput').val().split(',');
				cond.db=id[0];
				cond.device=id[1];
				cond.address=id[2];
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

		console.log(data);		
		websocket.emit('db-save','actions',data,'address');
		
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
	
	


});

