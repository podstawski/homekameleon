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
		title: 'Stan',
		data: "value",
		sortable: false,
		width: "7%",		
		render: function ( data, type, full, meta ) {
            var cl=data==1?' on':'';
			return '<svg class="glyph stroked flag'+cl+'"><use xlink:href="#stroked-flag"/></svg>';
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

websocket.emit('ios');

websocket.on('ios',function(ios){
    

    var data=ios.data;
    var datatable = $('.iostable').dataTable().api();

	for (var i=0; i<data.length;i++) {
		data[i].DT_RowId=data[i].haddr;
	
		for (var j=0; j<iosColumns.length; j++) {
			if (iosColumns[j].data==null) continue;
			
			if (typeof(data[i][iosColumns[j].data])=='undefined') {
                data[i][iosColumns[j].data]='';
            }
		}
		
	}
	
	datatable.clear();
    datatable.rows.add(data);
    datatable.draw();
});




$(document).on('click','.iostable svg',function(e){

    var id=$(this).closest('tr').attr('id');
    var ios={};
    if (this.className.baseVal.indexOf('gear')>=0) {
        alert('nie tak szybko, cwaniaczku, za chwilkę!');
    } else {
        ios[id]=this.className.baseVal.indexOf('trash')<0;
        websocket.emit('ios',ios);
        
        if (ios[id]) {
            var me=$(this);
            me.fadeOut(500,function(){
                me.fadeIn(500);
            });
        }
        
    }


});
