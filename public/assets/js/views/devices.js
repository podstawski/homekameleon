/**
 * @author Piotr Podstawski <piotr@webkameleon.com>
 */



/*
 * columns definitions for DataTable
 */
var devicesColumns=[
	{ title: $.translate("Name"), data: "name" },
    { title: $.translate("Symbol"), data: "symbol" },
	{ title: $.translate("Tags"), data: "tags" },
    { title: $.translate("Inputs") , data: "inputs"},
    { title: $.translate("Outputs"), data: "outputs" },
    {
		title: $.translate("Actions"),
		orderable: false,
		data: null,
		defaultContent: '<a class="btn btn-info" href="#"><i class="fa fa-edit" data-toggle="modal" data-target="#edit-device"></i></a> <a class="btn btn-danger" data-target="#confirm-delete" data-toggle="modal" href="#"><i class="fa fa-trash-o "></i></a>'
	}
];

var devicesData={};

/*
 *device grouping select
 *
 */

var deviceGroups = [
        {value:'bolt',label:'Power'},
        {value:'bell',label:'Alarms'},
        {value:'dashboard',label:'Counters'},
        {value:'sun-o', label:'Lights'},
        {value:'toggle-on', label:'Switches'},
        {value:'television', label:'Multimedia'},
        {value:'cloud', label:'Temperature'}
];

/*
 *callingControl
 *after fireing control edit we need context - id
 */
var callingControl=null;

/*
 * function: devicesTableDraw
 * called from websocket on data ready
 */
var devicesTableDraw = function(data) {

	devicesData={};

	var datatable = $('.devicetable').dataTable().api();

	for (var i=0; i<data.length;i++) {
		data[i].DT_RowId=data[i].id;
	
		for (var j=0; j<devicesColumns.length; j++) {
			if (devicesColumns[j].data==null) continue;
			
			if (typeof(data[i][devicesColumns[j].data])=='undefined') {
                data[i][devicesColumns[j].data]='';
            }
		}
		
		devicesData[data[i].id] = data[i];
		
	}
	
	

	datatable.clear();
    datatable.rows.add(data);
    datatable.draw();
}

/*
 *if symbol is empty - disable device drawing
 *otherwise enable it
 */
var toggleDisabled = function() {
	var symbol=$('#edit-device input[name="symbol"]');
	
	if (symbol.length>0) {
        if (symbol.val().length>0) {
            $('#edit-device .disable-toggle').hide();
        } else {
			$('#edit-device .disable-toggle').show();
		}
    }
}

/*
 *draw a control
 *obj: object in DOM, if null: we should add one
 */
var addControl = function (obj,data) {

	var activate = function(obj) {
		$('#edit-device .device-controls-container .drg').removeClass('drg-active');
		obj.addClass('drg-active');
		
		$('#edit-device .device-controls-top-container .dim').show();
		$('#edit-device .device-controls-top-container .dim .x').val(parseInt(obj.css('left')));
		$('#edit-device .device-controls-top-container .dim .y').val(parseInt(obj.css('top')));
		$('#edit-device .device-controls-top-container .dim .w').val(parseInt(obj.width()));
		$('#edit-device .device-controls-top-container .dim .h').val(parseInt(obj.height()));
	}

	
	var dst=$('#edit-device .device-controls-container');

	
	if (obj==null) {
        obj=$('<div class="drg"></div>');
		for(var k in data) {
			obj.attr(k,data[k]);
		}

		
		obj.css({
			left: data.x*dst.width(),
			top: data.y*dst.height(),
			width: data.w*dst.width(),
			height:data.h*dst.height()
		});
	
		
	} else {
		activate(obj);
	}
	

	obj.appendTo(dst);
	obj.resizable({containment:'parent',
				  start: function() {activate($(this));},
				  stop: function() {activate($(this));}
				  });
	obj.draggable({containment:'parent',
				  start: function() {activate($(this));},
				  stop: function() {activate($(this));}
				  });
	
	obj.click(function() {
		activate($(this));
	});
	
	obj.dblclick(function(){
		activate($(this));
		
		$('#edit-control').modal('show');
		$('#edit-control').attr('symbol',$('#edit-device input[name="symbol"]').val());
		var type=$(this).attr('type');
		
		callingControl=$(this);
	
		$.smekta_file('views/smekta/control-'+type+'.html',{style:$(this).attr('s')},'#edit-control .modal-body',function(){
			websocket.emit('files',$('#edit-control').attr('symbol'));
		
			for (var i=0;i<obj[0].attributes.length; i++) {
				var attr=obj[0].attributes[i].nodeName;
				var val=obj[0].attributes[i].nodeValue;
				$('#edit-control input[name="'+attr+'"]').val(val);
			}
			
			$('#edit-control .modal-body .help-block a').click(function(){
				var dst=$(this).parent().parent().find('input');
				var val=dst.val();
				if (val.length>0) val+=';';
				val+=$(this).text();
				dst.val(val);
			});
		});
	});
	
	obj.contextmenu(function(e){
		$(this).remove();
		e.preventDefault();
	});
	
	controlsStyle();
}

var controlsStyle=function() {

	$('#edit-device .device-controls-container div[type]').each( function(){
		var addr=$(this).attr('addr');

		var style=$(this).attr('sstyle');
		var state=$(this).attr('state');
		var simage=$(this).attr('simage');

		var min=$(this).attr('min');
		var max=$(this).attr('max');	
		
		var originalStyle=$(this).attr('style');
		var destStyle=originalStyle;
		
		var type=$(this).attr('type');
		
		
		if (type=='inout' && style!==undefined && state!==undefined) {
            style=style.replace('__STATE__',state);
			destStyle+=';'+style;
			
			$(this).attr('style',destStyle);
        }
		
		if (type=='slider' && style!==undefined && state!==undefined && min!==undefined && max!=undefined) {
			var prc=Math.round(100*(parseFloat(state)-parseFloat(min))/(parseFloat(max)-parseFloat(min)));
			var rprc=100-prc;
			style=style.replace('__PRC__',prc).replace('__RPRC__',rprc);

			
			
			$(this).find('.slider').remove();
			
			var img='';
			if (simage!==undefined && simage.length>0) {
				var imgstyle='left:'+prc+'%';
				if (prc>90) {
                    imgstyle='right: 0';
                }
                img='<img style="'+style+';'+imgstyle+'" src="'+simage+'"/>'
            } else {
				img='<div style="'+style+'; width:'+prc+'%" class="progressbar">';
			}
			
			$(this).append('<div class="slider">'+img+'</div>');
		}
		
		
		if (type=='txt') {
			$(this).find('.outertxt').remove();
			$(this).append('<div class="outertxt"><div class="innertxt">'+$(this).attr('state')+'</div></div>');
		}

		
	});
}

var displayFileList = function(dir,files) {

	if (dir==$('#edit-control').attr('symbol')) {
		
		var f=[];
		for(var i=0;i<files.length;i++) {
			f.push({name:files[i],dir:dir});
		}

		$.smekta_file('views/smekta/control-images.html',{files:f},'#edit-control ul.images',function(){
		
			/*
			 *image click: rewrite image url to background-image style
			 */
			$('.uploaded-images').click(function() {
				var img=$(this).parent().find('input').val();
				$('#edit-control .slider #simage').val('images/'+dir+'/'+img);
				if ($('#edit-control #state').val().length>0) {
                    img=img.replace($('#edit-control #state').val(),'__STATE__');
                }
				$('#edit-control .inout #sstyle').val('background-image: url(images/'+dir+'/'+img+')')
			});
			
			/*
			 *trash icon click on image list
			 */
			$('#edit-control .modal-body ul.images li i').click(function(){
				var f=$(this).parent().find('input').attr('rel');
				websocket.emit('remove-file',f);
			});
		
		});
		
    }
};


var startDraggingLabels = function() {
	
	$('#edit-device .device-controls-label-container div').draggable({
		containment: "#edit-device .device-controls-top-container",
		helper: "clone",
		start: function() {
		},
		stop: function() {
			var hlp=$('#edit-device .ui-draggable-dragging').position();
			var top=$('#edit-device .device-controls-top-container').offset();
			var lbl=$('#edit-device .device-controls-label-container').offset();
			var sqr=$(this).offset();
			var pos=$(this).position();
			
			var dst=$('#edit-device .device-controls-container');
			var dstoffs=dst.offset();
			
			var _left=hlp.left - (dstoffs.left -top.left) + (lbl.left-top.left);
			var _top=sqr.top - top.top + hlp.top - pos.top;
		
			
			var obj=$(this).clone();
			obj.appendTo(dst);
			obj.css({
				position: 'absolute',
				left: _left,
				top: _top
			});
			

			
			if (obj.position().left > dst.width()) {
                obj.remove();
            } else {
				addControl(obj);			
			}
		
		}
		
	});

}



$(function(){
	
	document.title = $.translate('Devices');
	
	/*
	 *DataTable init
	 */
	$('.devicetable').DataTable({
		language: {
			url: "assets/js/datatables/"+$.translateLang()+".json"
		},
		columns: devicesColumns
	});

	/*
	 *set breadcrumbs path
	 */
	setBreadcrumbs([{name: $.translate('Devices'), href:'devices.html'}]);
	
	/*
	 *plus icon click - fire: add empty record
	 */
	$('.devices .add-item').click(function(e) {
		websocket.emit('db-save','devices',{});
	});
	
	/*
	 *request to get all devices
	 */
	websocket.emit('db-get','devices');

	
	if (typeof($.devicesInitiated)=='undefined') { //prevent multi event
	
		/*
		 *when delete button clicked in table list
		 *open confirm modal dialog
		 */
		$(document).on('click','.devicetable td a.btn-danger',function(e){
			var id=$(this).parent().parent().attr('id');
			$('#confirm-delete').attr('rel',id);
			$('#confirm-delete .modal-header h4').text(devicesData[id].name);
		});
		
		/*
		 *when edit button clicked in table list
		 *open edit modal dialog
		 */
		$(document).on('click','.devicetable td a.btn-info',function(e){
			
			$('#edit-device').modal('show');
			var id=$(this).parent().parent().attr('id');
			$('#edit-device').attr('rel',id);
			
			
			$('#edit-device input[name="name"]').val(devicesData[id].name);
			$('#edit-device input[name="symbol"]').val(devicesData[id].symbol);

			
			devicesData[id].groups=JSON.parse(JSON.stringify(deviceGroups));
			
			var tags=devicesData[id].tags;
			if (typeof(tags)=='string') tags=tags.split(' ');
			
			for (var i=0; i< tags.length; i++) {
				for (var j=0;j<devicesData[id].groups.length; j++) {
                    if (devicesData[id].groups[j].value==tags[i]) {
                        devicesData[id].groups[j].selected=true;
						continue;
                    }
                }
			}
			
			
			/*
			 *draw edit body
			 */
			$.smekta_file('views/smekta/device.html',devicesData[id],'#edit-device .modal-body',function(){
				$('#edit-device .modal-body .translate').translate();
				$('#edit-device .modal-body #tags').select2();
				
				startDraggingLabels();
				toggleDisabled();
				$('#edit-device input[name="symbol"]').change(toggleDisabled);
				
				setTimeout(
					function() {
						
						var wh=devicesData[id].wh||1;
								
						var w=$('#edit-device .device-controls-container').width();
						$('#edit-device .device-controls-container').height(w);
						$('#edit-device .device-attrinutes-container').height(w);
						
						if (wh>1) {
                            $('#edit-device .device-controls-container').height(w/wh);
                        }
						
						if (wh<1) {
                            $('#edit-device .device-controls-container').width(w/wh);
                        }
						
						
						$('#edit-device .device-controls-container').resizable({
							stop: function() {
								if ($(this).width()>w) $(this).width(w);
								if ($(this).height()>w) $(this).height(w);
							}
						});
						
						/*
						 *draw controls
						 */
						if (devicesData[id].controls !== undefined) {
							for (var i=0; i<devicesData[id].controls.length; i++) {
								addControl(null,devicesData[id].controls[i]);
							}
						}
						
						/*
						 *dimension inputs behavior
						 */
						
						$('#edit-device .device-controls-top-container .dim input').focus(function(){
							$(this).attr('prev',$(this).val());
						});
					},
					400);
								

				
				$('#edit-device .device-controls-top-container .dim input').change(function(){
					// -2: border
					var w=$('#edit-device .device-controls-container').width()-2;
					var h=$('#edit-device .device-controls-container').height()-2;
					
					if (
						parseInt($(this).val())<0
						||
						parseInt($('#edit-device .device-controls-top-container .dim input.x').val()) + parseInt($('#edit-device .device-controls-top-container .dim input.w').val()) > w
						||
						parseInt($('#edit-device .device-controls-top-container .dim input.y').val()) + parseInt($('#edit-device .device-controls-top-container .dim input.h').val()) > h
					) {
                        $(this).val($(this).attr('prev'));
						return false;
                    }
					
			
					$('#edit-device .device-controls-container .drg-active').css({
						left: $('#edit-device .device-controls-top-container .dim input.x').val()+'px',
						top: $('#edit-device .device-controls-top-container .dim input.y').val()+'px',
						width: $('#edit-device .device-controls-top-container .dim input.w').val()+'px',
						height: $('#edit-device .device-controls-top-container .dim input.h').val()+'px'
					});
					
				});
				
			});
			
		});
		
		$.devicesInitiated=true;
    }
	
	/*
	 *remove confirmed
	 */
	$('#confirm-delete .btn-danger').click(function(e){
		$('#confirm-delete').modal('hide');
		websocket.emit('db-remove',$('#confirm-delete').attr('table'),$('#confirm-delete').attr('rel'));
	});

	/*
	 *save button in device edit
	 */
	$('#edit-device .btn-info').click(function(e){
		$('#edit-device').modal('hide');
		var data={id:$('#edit-device').attr('rel')};
		
		$('#edit-device input,#edit-device select').each(function(){
			data[$(this).attr('name')]=$(this).val();
		});
		
		if (typeof(data.tags)=='object') data.tags=data.tags.join(' ');
		
		data.wh = $('#edit-device .device-controls-container').width() / $('#edit-device .device-controls-container').height();
		
		var controls=[];
		
		$('#edit-device .device-controls-container div').each( function(){
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
			
			// double border
			if ($(this).width()+4 == $(this).parent().width() ) {
                control.w=1;
            }		
			if ($(this).height()+4 == $(this).parent().height() ) {
                control.h=1;
            }
	
			if (position.left==1) {
                control.x=0;
            }
			
			if (position.top==1) {
                control.y=0;
            }
					
		
			controls.push(control);
		});

		data.controls=controls;

		/*
		 *count inputs and outputs
		 */
		data.inputs=$('#edit-device .device-controls-container div.drg:not([estate=""])').length;
		data.outputs=$('#edit-device .device-controls-container div.drg:not([state=""])').length;
	
		/*
		 *send save request
		 */
		websocket.emit('db-save','devices',data);
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

