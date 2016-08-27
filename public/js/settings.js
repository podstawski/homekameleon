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
            
            $('body').fadeOut(1000,function(){
                var timer=60;
                var showTime=function(){
                    $('body').html('<p align="center">Proszę czekać '+timer+'s.</p>');
                    timer--;
                    if (timer==0) {
                    	$('body').html('<p align="center">Przelacz sie na siec homekameleon i sprawdz</p>');
                    } else {
                        setTimeout(showTime,1000);
                    }
                }
                showTime();
                $('body').show();
            });
           
            return false;
        });
    });
});