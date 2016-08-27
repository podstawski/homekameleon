jQuery.fn.selectText = function(){
    var doc = document;
    var element = this[0];
  
    if (doc.body.createTextRange) {
        var range = document.body.createTextRange();
        range.moveToElementText(element);
        range.select();
    } else if (window.getSelection) {
        var selection = window.getSelection();        
        var range = document.createRange();
        range.selectNodeContents(element);
        selection.removeAllRanges();
        selection.addRange(range);
    }
};



var websocket = io.connect();

websocket.on('cookie',function(cn,cv) {
    document.cookie=cn+'='+cv;
});



var lang='';
websocket.on('lang',function(lng,login){
    lang=lng;
    $.getScript( 'js/'+lang+'.js');
    

    if (login) {
        $('.loggedin').show();
        $('.loggedout').hide();
        $('.username').text('Admin');
    } else {
        $('.loggedin').hide();
        $('.loggedout').show();
        $('.username').text('Gość');      
    }
});

$('.logout a').click(function(){
    $('.loggedin').hide();
    $('.loggedout').show();
    $('.username').text('Guest');
    websocket.emit('logout');
    $('body').fadeOut(1000,function(){
        location.href='index.html';
    });
}); 
