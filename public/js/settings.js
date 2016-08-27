var navReady = function () {
    $('.settings').addClass('active');
};

$(window).on('resize', function () {
  if ($(window).width() > 768) $('#sidebar-collapse').collapse('show')
})
$(window).on('resize', function () {
  if ($(window).width() <= 767) $('#sidebar-collapse').collapse('hide')
})

websocket.emit('wifi');

websocket.once('wifi',function(wifi) {

    if (wifi==null) return;
    
    $.smekta_file('views/wifi.html',wifi,'.main .panel .panel-body',function(form){
        $('form button.btn-primary').click(function(){
            websocket.emit('wifi',$('form').serializeArray());
           
            return false;
        });
    });
});