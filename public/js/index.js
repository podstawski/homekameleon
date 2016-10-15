

var navReady = function () {
    $('.dashboard').addClass('active');
};



websocket.emit('ping2','8.8.8.8');

websocket.once('ping2',function(stdout,stderr){
    if (stdout.indexOf(' 0%')>0) {
        $('.alert').addClass('bg-success');
    } else {
        $('.alert').addClass('bg-danger');
    }
   
});

websocket.emit('collections');
