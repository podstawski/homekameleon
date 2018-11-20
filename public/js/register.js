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
	{ title: "IP",data: "ip"},
    {
		title: 'HB',
		data: "hb",
        width: "13%",
		sortable: false,		
		render: function ( data, type, full, meta ) {
			
            if (!data) return '';
            return new moment(data).format('DD-MM-YY, HH:mm:ss');
		}
	},
    { title: "We",data: "inputs", width: "5%",className: 'inputs' },
    { title: "Wy",data: "outputs", width: "5%",className: 'outputs'},
    { title: "Te",data: "temps", width: "5%"},
    {
		title: 'WiFi',
		data: "homekameleon",
		sortable: false,
        width: "16%",
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
            var rst='<svg class="glyph stroked pen tip"><use xlink:href="#stroked-pen-tip"/></svg>';
            return flash+rst+'<svg class="glyph stroked trash"><use xlink:href="#stroked-trash"/></svg>';
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

$(document).on('click','.registertable svg.pen',function(e){
    var id=$(this).closest('tr').attr('id');
    websocket.emit('reset',{hwaddr: id});

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

$(document).on('click','.registertable .inputs',function(e){
    var id=$(this).closest('tr').attr('id');
    var ios=prompt('Podaj numer wejścia w formacie 1:4, czyli wejście 1 ma być skojarzone z pinem 4, aby usunąć wejście nr 2 wpisz "2:"','1:4');
    if (ios && ios.match(/^[0-9:]+$/)) websocket.emit('register',{hwaddr: id, ioset: 'i:'+ios});
});

$(document).on('click','.registertable .outputs',function(e){
    var id=$(this).closest('tr').attr('id');
    var ios=prompt('Podaj numer wyjścia w formacie 3:15, czyli wyjście 3 ma być skojarzone z pinem 15, aby usunąć wyjście nr 3 wpisz "3:"','3:15');
    if (ios && ios.match(/^[0-9:]+$/)) websocket.emit('register',{hwaddr: id, ioset: 'o:'+ios});
});