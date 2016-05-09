
var globalDevices={};

$('#logout').click(function () {
    websocket.emit('logout');
});


function setBreadcrumbs(b) {
    $('.breadcrumb .breadcrumb-item').remove();
    
    var html='';
    for(var i=0; i<b.length; i++) {
        var a=i==b.length-1?' active':'';
        html+='<li class="breadcrumb-item'+a+'"><a href="'+b[i].href+'">'+b[i].name+'</a></li>';
    }
    
    $(html).insertAfter('.breadcrumb .breadcrumb-home');
}

var buildAsideMenu = function(data) {

    var tags={};

    for (var i=0;i<data.length; i++) {
        data[i].tags=data[i].tags.replace(',',' ');
        data[i].tags=data[i].tags.replace(/ +/,' ');
        var t=data[i].tags.split(' ');
        for (var j=0; j<t.length; j++) {
            if (t[j].length) tags[t[j]]=true;
        }
        
        globalDevices[data[i].symbol]=data[i];
    }

    
    var tags2=[];
 
    for (var k in tags) tags2.push({tag:k});

    $.smekta_file('views/smekta/aside-devices.html',{tags:tags2,devices:data},'aside.aside-menu',function(){
        $('aside.aside-menu .translate').translate();
        $('aside.aside-menu ul.nav-tabs a.nav-link').click(function(){
            $('aside.aside-menu #devices .all').hide();
            $('aside.aside-menu #devices .'+$(this).attr('rel')).show();
        });
        
        if (typeof(drawAsideDevices) == 'function') {
            drawAsideDevices();
        }
    });

}



var pageCleanup=function() {
    $('.breadcrumb i.icon-note').parent().hide();
    $('.breadcrumb i.icon-menu').parent().hide();
    
    if ($('body').hasClass('aside-menu-open')) {
        $('body').removeClass('aside-menu-open');
    }

}

var busSend=function(haddr,state) {
   console.log('busSend(','"'+haddr+'",',state,')');
   websocket.emit('bus',haddr,state);
   return 'OK';
}


$(function(){
    
    (function() {
        var loadPageParent = window.loadPage;
        
        pageCleanup();
        
        window.loadPage = function(url) {
            //console.log(url);
            pageCleanup();
            loadPageParent(url);        
        }
    
    })();

});
