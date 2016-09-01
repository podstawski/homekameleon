var navReady = function () {
    $('.buffer').addClass('active');
};

$(window).on('resize', function () {
  if ($(window).width() > 768) $('#sidebar-collapse').collapse('show')
})
$(window).on('resize', function () {
  if ($(window).width() <= 767) $('#sidebar-collapse').collapse('hide')
})


var bufferColumns=[
	{ title: "Adres",data: "hwaddr"},
    { title: "Wejścia",data: "inputs", width: "5%"},
    { title: "Wyjścia",data: "outputs", width: "5%"},
    
    {
		title: 'Aktywuj',
		data: "active",
		sortable: false,
		width: "10%",		
		render: function ( data, type, full, meta ) {
			//var ch=data==1?'checked':'';
			return '<svg class="glyph stroked checkmark"><use xlink:href="#stroked-checkmark"/></svg>';
		}
	},
    {
		title: 'Usuń',
		orderable: false,
		data: null,
		width: "10%",
		defaultContent: '<svg class="glyph stroked trash"><use xlink:href="#stroked-trash"/></svg>'
	}
];


$('.buffertable').DataTable({
    language: {
        url: "js/datatables/pl.json"
    },
    columns: bufferColumns
});

websocket.emit('buffer');

websocket.on('buffer',function(buffer){
    
    var data=buffer.data;
    var datatable = $('.buffertable').dataTable().api();

	for (var i=0; i<data.length;i++) {
		data[i].DT_RowId=data[i].hwaddr;
	
		for (var j=0; j<bufferColumns.length; j++) {
			if (bufferColumns[j].data==null) continue;
			
			if (typeof(data[i][bufferColumns[j].data])=='undefined') {
                data[i][bufferColumns[j].data]='';
            }
		}
		
	}
	
	datatable.clear();
    datatable.rows.add(data);
    datatable.draw();
});


$(document).on('click','.buffertable svg',function(e){
    var id=$(this).closest('tr').attr('id');
    var buffer={};
    buffer[id]=this.className.baseVal.indexOf('trash')<0;
    websocket.emit('buffer',buffer);

});
