var navReady = function () {
    $('.register').addClass('active');
};

$(window).on('resize', function () {
  if ($(window).width() > 768) $('#sidebar-collapse').collapse('show')
})
$(window).on('resize', function () {
  if ($(window).width() <= 767) $('#sidebar-collapse').collapse('hide')
})


var registerColumns=[
    { title: "Adres",data: "hwaddr"},
    {
        title: "Nazwa",
        data: "name",
        className: 'name',
    },
	
    { title: "We",data: "inputs", width: "5%"},
    { title: "Wy",data: "outputs", width: "5%"},
    { title: "Te",data: "temps", width: "5%"},
    {
		title: 'WiFi',
		data: "homekameleon",
		sortable: false,		
		render: function ( data, type, full, meta ) {
			//var ch=data==1?'checked':'';
            
			var ret='<input type="radio" name="wifi_'+full.address+'" class="homekameleon" '+(data?'checked':'')+' value="1"/> Homekameleon';
            ret+=' &nbsp; <input type="radio" name="wifi_'+full.address+'" class="homekameleon" '+(data?'':'checked')+' value="0"/> WAN';
            return ret;
		}
	},
    {
		title: 'Opcje',
		orderable: false,
		data: null,
		width: "10%",
        render: function ( data, type, full, meta ) {
            var flash='';
            
            if (full.needFlash) flash='<svg class="glyph stroked upload"><use xlink:href="#stroked-upload"/></svg>';
            return flash+'<svg class="glyph stroked trash"><use xlink:href="#stroked-trash"/></svg>';
        }

	}
];


$('.registertable').DataTable({
    language: {
        url: "js/datatables/pl.json"
    },
    columns: registerColumns
});

websocket.emit('register');

websocket.on('register',function(register){
    
    var data=register.data;
    var datatable = $('.registertable').dataTable().api();

	for (var i=0; i<data.length;i++) {
		data[i].DT_RowId=data[i].hwaddr;
	
		for (var j=0; j<registerColumns.length; j++) {
			if (registerColumns[j].data==null) continue;
			
			if (typeof(data[i][registerColumns[j].data])=='undefined') {
                data[i][registerColumns[j].data]='';
            }
		}
		
	}
	
	datatable.clear();
    datatable.rows.add(data);
    datatable.draw();
});


$(document).on('click','.registertable svg.trash',function(e){
    var id=$(this).closest('tr').attr('id');
    websocket.emit('register',{hwaddr: id, active: false});

});

$(document).on('click','.registertable svg.upload',function(e){
    var id=$(this).closest('tr').attr('id');
    websocket.emit('flash',{hwaddr: id});
    $(this).fadeOut(500);
});


$(document).on('click','.registertable input[type="radio"]',function(e){
    var id=$(this).closest('tr').attr('id');
    websocket.emit('register',{hwaddr: id, homekameleon: $(this).val()=='1'});
});

$(document).on('click','.registertable td.name', function(e) {
    var text=$(this).html();
    if (text.indexOf('<input')==-1) 
        $(this).html('<input value="'+text+'" type="text" class="name" placeholder="tu wpisz nazwę"/>');
});

$(document).on('change','.registertable input[type="text"]',function(e){
    var id=$(this).closest('tr').attr('id');
    websocket.emit('register',{hwaddr: id, name: $(this).val()});
});