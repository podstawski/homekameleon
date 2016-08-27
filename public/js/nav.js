$.get('views/nav.html',function(nav){
    $('body').prepend(nav);
    if (typeof(navReady)=='function') navReady();
});