/**
 * @author Piotr Podstawski <piotr@webkameleon.com>
 */



/*
 * columns definitions for DataTable
 */
var usersColumns=[
	{
		title: $.translate("Name"),
		data: "name",

	},
    { title: $.translate("Username"), data: "username" },
	{ title: $.translate("Email"), data: "email" },
    {
		title: $.translate("Active"),
		data: "active",
		sortable: false,
		render: function ( data, type, full, meta ) {
			var ch=data==1?'checked':'';
			
			return '<label class="switch switch-default switch-success"><input rel="active" type="checkbox" class="switch-input" '+ch+'><span class="switch-label"></span><span class="switch-handle"></span></label>';
		}
	},
	{
		title: $.translate("Admin"),
		data: "admin",
		sortable: false,
		render: function ( data, type, full, meta ) {
			var ch=data==1?'checked':'';
			
			return '<label class="switch switch-default switch-danger"><input rel="admin" type="checkbox" class="switch-input" '+ch+'><span class="switch-label"></span><span class="switch-handle"></span></label>';
		}
	},
    {
		title: $.translate("Actions"),
		orderable: false,
		data: null,
		defaultContent: '<a class="btn btn-info" href="#"><i class="fa fa-edit" data-toggle="modal" data-target="#edit-user"></i></a> <a class="btn btn-danger" data-target="#confirm-delete" data-toggle="modal" href="#"><i class="fa fa-trash-o "></i></a>'
	}
];

var usersData={};
var usersDataArray=[];


/*
 *callingControl
 *after fireing control edit we need context - id
 */
var callingControl=null;

/*
 * function: usersTableDraw
 * called from websocket on data ready
 */
var usersTableDraw = function(data) {

	usersData={};

	var datatable = $('.usertable').dataTable().api();

	for (var i=0; i<data.length;i++) {
		data[i].DT_RowId=data[i].username;
	
		for (var j=0; j<usersColumns.length; j++) {
			if (usersColumns[j].data==null) continue;
			
			if (typeof(data[i][usersColumns[j].data])=='undefined') {
                data[i][usersColumns[j].data]='';
            }
		}
		
		usersData[data[i].DT_RowId] = data[i];

	}
	
	usersDataArray=data;
	
	
	datatable.clear();
    datatable.rows.add(data);
    datatable.draw();
}


var listenForUsers=function(get) {
	websocket.once('users-all', function(data) {
		usersTableDraw(data.data);
	});
	if (get) websocket.emit('db-get','users');
}




$(function(){
	
	/*
	 *DataTable init
	 */
	$('.usertable').DataTable({
		language: {
			url: "assets/js/datatables/"+$.translateLang()+".json"
		},
		columns: usersColumns
	});

	/*
	 *set breadcrumbs path
	 */
	setBreadcrumbs([{name: $.translate('Users'), href:'users.html'}]);
		
	/*
	 *request to get all users
	 */
	
	listenForUsers(true);
	
	var clearReferenceClasses = function(newclass) {
		$('#edit-user').removeClass('add-user').removeClass('edit-user').addClass(newclass);
		
	};
	
	if (typeof($.usersInitiated)=='undefined') { //prevent multi event
	
		/*
		 *add plus clicked
		 */
	
		$(document).on('click','.users .add-item',function(e) {
			clearReferenceClasses('add-user');
			$('#edit-user').modal('show');
			$('#edit-user .modal-header h4').text($.translate('New user'));
			
			$.smekta_file('views/smekta/add-user.html',null,'#edit-user .modal-body',function(){
				$('#edit-user .modal-body .translate').translate();
				
				setTimeout(function(){$('#edit-user .modal-body input').val('');},100);
				
			});
					
					
		});
	
		/*
		 *when delete button clicked in table list
		 *open confirm modal dialog
		 */
		$(document).on('click','.usertable td a.btn-danger',function(e){
			var id=$(this).parent().parent().attr('id');
			$('#confirm-delete').attr('rel',id);
			$('#confirm-delete .modal-header h4').text(usersData[id].username);
		});
		
		/*
		 *when edit button clicked in table list
		 *open edit modal dialog
		 */
		$(document).on('click','.usertable td a.btn-info',function(e){
			
			clearReferenceClasses('edit-user');
			$('#edit-user').modal('show');
			
			var id=$(this).parent().parent().attr('id');
			$('#edit-user').attr('rel',id);
			$('#edit-user .modal-header h4').text(usersData[id].username);

			usersData[id].allProjects = JSON.parse(JSON.stringify(globalProjects));
			
			console.log(usersData[id]);
			
			if (usersData[id].projects!==undefined && usersData[id].projects!=null) {
				for(var i=0; i<usersData[id].projects.length; i++) {
					var pr=parseInt(usersData[id].projects[i]);
			
					for (var j=0; j<usersData[id].allProjects.length; j++) {
						if (usersData[id].allProjects[j].id==pr) {
							usersData[id].allProjects[j].selected=true;
							break;
                        }
					}
				}
            }
			
			
			$.smekta_file('views/smekta/edit-user.html',usersData[id],'#edit-user .modal-body',function(){
				$('#edit-user .modal-body .translate').translate();
				setTimeout(function(){$('#edit-user .modal-body input[type="password"]').val('');},400);
				
				$('#edit-user .modal-body select').select2();
			});	
			
		});
		
		$(document).on('click','.usertable .switch input',function(e){
			
			var data={username: $(this).parent().parent().parent().attr('id')};
			var field=$(this).attr('rel');
			data[field]=$(this).prop('checked')?1:0;
			websocket.emit('db-save','users',data,'username');
			usersData[data.username][field]=data[field];
		});
		
		$.usersInitiated=true;
    }
	
	/*
	 *remove confirmed
	 */
	$('#confirm-delete .btn-danger').click(function(e){
		$('#confirm-delete').modal('hide');
		websocket.emit('db-remove','users',$('#confirm-delete').attr('rel'));
		listenForUsers();
	});

	/*
	 *save button in user edit
	 */
	$('#edit-user .btn-info').click(function(e){
		
		var data={username:$('#edit-user').attr('rel')};

		$('#edit-user input,#edit-user select').each(function(){
			if(typeof($(this).attr('name'))!='undefined') data[$(this).attr('name')]=$(this).val();
		});
		
		if ($('#edit-user').hasClass('add-user')) {
            websocket.emit('add-user',data);
			websocket.once('add-user',function(data) {
				$('#edit-user').modal('hide');
				listenForUsers(true);
			});
        }
		
		
		if ($('#edit-user').hasClass('edit-user')) {
			$('#edit-user').modal('hide');
			if (data.password.trim().length==0) {
                delete(data.password);
            }
			
            websocket.emit('db-save','users',data,'username');
			websocket.once('users',function(row) {
				listenForUsers(true);
			});
        }
		
		
	});

	/*
	 *upload new image icon clicked and user chose image
	 */
	$('#img-user').on('change',function(){
		var d=$('#img-user').prop('files')[0];
		if (typeof(d)!='undefined') {
			var file_reader = new FileReader();
			file_reader.readAsDataURL(d);
			
			file_reader.onload = function() {
				websocket.emit('upload-file',$('#edit-control').attr('symbol'),file_reader.result);
				
			};
		}
	
	
	});
	
	
	


});

