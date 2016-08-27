var charts={};
var chartsObj = new chartsClass();

function getParameterByName(name, url) {
    if (!url) url = window.location.href;
    name = name.replace(/[\[\]]/g, "\\$&");
    var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
        results = regex.exec(url);
    if (!results) return null;
    if (!results[2]) return '';
    return decodeURIComponent(results[2].replace(/\+/g, " "));
}

var lang=getParameterByName('lang');

websocket.on('lang',function(lng){
    if (!lang) lang=lng;
    $.getScript( 'js/'+lang+'.js');
    if (getParameterByName('chart')) {
        var charts=getParameterByName('chart').split('|');
        
        websocket.emit('chart',charts,null,getParameterByName('period'));
    }
    
    
});

var chartReady = function(id) {
    console.log(id);
    var period=getParameterByName('period');
    if (period!=null) {
        var period_li=$('#'+id+' [rel="'+period+'"]');
        if (period_li.length>0) {
            $('#'+id+' .period').removeClass('active');
            period_li.addClass('active');
        }
    }
    
    
}