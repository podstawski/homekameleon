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
                    	$('body').html('<p align="center">Przełącz się do sieci homekameleon, a następnie <a href="index.html?check='+Math.random()+'">sprawdź</a></p>');
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


websocket.once('wifis',function(wifis){
    var ssid=$('form input[name="ssid"]').val();
    for (var k in wifis) {
        console.log(k,$('form select[name="ssid"]'));
        var option='<option value="'+k;
        if(k==ssid) option+=' selected';
        option+='>'+k+'</option';
        $('form select[name="ssid"]').append(option);
    }
    $('form select').show();

    console.log(wifis);
});