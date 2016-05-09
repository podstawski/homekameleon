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
    { title: $.translate("Type") , data: "type"},
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
		
		data[i].id='input,'+data[i].device+','+data[i].address;
	}
	
	inputsDataArray=data.data;
	
	
	datatable.clear();
    datatable.rows.add(data);
    datatable.draw();
}


var drawScriptSelects = function(selection) {
	
	$(selection+' select.scripts').each(function(){
		
		var id=$(this).attr('rel');
		var select=$(this);
		
		$.smekta_file('views/smekta/script-select.html',{scripts:scriptsDataArray},this,function(){
			select.val(id);
			select.select2();
		});
	});
}

var drawIOSelects = function(selection) {
	
	$(selection+' select.inputoroutput').each(function(){
		
		var id=$(this).attr('rel');
		var select=$(this);
		
		

		$.smekta_file('views/smekta/inputoutput-select.html',{inputs:inputsDataArray,outputs:outputsDataArray},this,function(){
			select.val(id);
			select.select2();
		});
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
		
	/*
	 *request to get all inputs
	 */
	websocket.emit('db-get','inputs');
	websocket.once('inputs-all', function(data) {
		inputsTableDraw(data.data);
	});
	
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
			$('#edit-input .modal-header h4').text(inputsData[id].name);
			
			websocket.emit('db-get','actions',id);
			websocket.once('actions',function(actions) {
				/*
				 *draw edit body
				 */
				
				if (actions.actions===undefined) {
                    actions.actions=[];
                }
				console.log(actions);
				$.smekta_file('views/smekta/input-actions.html',actions,'#edit-input .modal-body',function(){
					$('#edit-input .modal-body .translate').translate();
					
					$('#edit-input .modal-body li').append('<a class="x">×</a>');
					$('#edit-input .modal-body li a.x').click( function(){
						$(this).parent().remove();
					});
					drawScriptSelects('#edit-input .modal-body');
					drawIOSelects('#edit-input .modal-body');
					
				});

				
			});
			

			
		});
		
		$.inputsInitiated=true;
    }
	
	/*
	 *remove confirmed
	 */
	$('#confirm-delete .btn-danger').click(function(e){
		$('#confirm-delete').modal('hide');
		websocket.emit('db-remove','inputs',$('#confirm-delete').attr('rel'));
	});

	/*
	 *save button in input edit
	 */
	$('#edit-input .btn-info').click(function(e){
		$('#edit-input').modal('hide');
		var data={id:$('#edit-input').attr('rel')};
		
		$('#edit-input input,#edit-input select').each(function(){
			data[$(this).attr('name')]=$(this).val();
		});
		
		var controls=[];
		
		$('#edit-input .input-controls-container div').each( function(){
			if ($(this).attr('type')===undefined) return;
			
			$(this).resizable('destroy');
			var control={};

			for (var i=0;i<this.attributes.length; i++) {
				var attr=this.attributes[i].nodeName;
				var val=this.attributes[i].nodeValue;
				if (attr=='style') continue;
				if (attr=='class') continue;
				control[attr]=val;
			}
			
			var position=$(this).position();
			control.x=position.left/$(this).parent().width();
			control.y=position.top/$(this).parent().height();
			control.w=($(this).width()+2)/$(this).parent().width();
			control.h=($(this).height()+2)/$(this).parent().height();
			
					
			controls.push(control);
		});

		data.controls=controls;

		/*
		 *count inputs and outputs
		 */
		data.inputs=$('#edit-input .input-controls-container div[type="input"]').length;
		data.outputs=$('#edit-input .input-controls-container div[type="output"]').length;
	
		/*
		 *send save request
		 */
		websocket.emit('db-save','inputs',data);
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
	 *edit control save button
	 */
	$('#edit-control .modal-footer .btn-info').click(function (){
		$('#edit-control').modal('hide');
		$('#edit-control input').each(function (){
		
			if ($(this).attr('name')!==undefined) {
                callingControl.attr($(this).attr('name'),$(this).val());
            }
		});
		controlsStyle();
	});


});

