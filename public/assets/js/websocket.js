var websocket = io.connect();

websocket.on('err',function(err,details) {
    toastr.error($.translate(details), $.translate(err), {
        closeButton: true,
        progressBar: true,
    });
});


websocket.on('cookie',function(cn,cv) {
    document.cookie=cn+'='+cv;
});

websocket.on('login',function(data) {
    $('#username').text(data.username);
    currentuser=data;
    $('.after-login').removeClass('after-login').addClass('_after-login');
    $('body').addClass('sidebar-nav').removeClass('sidebar-off-canvas');

    if(window.location.hash=='#main.html') loadPage('dashboard.html');
});

websocket.on('logout',function() {
    $('#username').text('nobody');
    $('._after-login').removeClass('_after-login').addClass('after-login');
    $('body').removeClass('sidebar-nav').addClass('sidebar-off-canvas');
    
    $('.sidebar .sidebar-header div strong').text('');
    $('.sidebar .sidebar-header div small').text('');
    $('.sidebar .sidebar-header img.img-avatar').removeAttr('src');
    $('.sidebar #left-sidebar').html('');
    
    loadPage('main.html');
});

websocket.on('projects-all', function(pr) {
    globalProjects=pr.data;

    $.smekta_file('views/smekta/projects.html',pr,'#projects-footer',function() {
        $('#projects-footer .translate').translate();
    });
});

websocket.on('projects',function(data){
    
    for (var k in data) {
        if (k!='img') {
            $('#project input[name="'+k+'"]').val(data[k]);
        }
    }
    
    $('.sidebar .sidebar-header div strong').text(data.name);
    $('.sidebar .sidebar-header div small').text(data.description);
    $('.sidebar a.a-avatar').attr('href','project.html,'+data.id);
    
    if (typeof(data.img)!='undefined' && data.img.length>0) {
        $('#img_img,.sidebar .sidebar-header .img-avatar').attr('src',data.img);
    }
    
    var hash=window.location.hash;
    
    if (hash.indexOf('project.html')>0) {
        $('.page-title').text(data.name);
        $('.page-desc').text(data.description);
        document.title = data.name;
        
        setBreadcrumbs([{name: data.name, href:'project.html,'+data.id}]);

        toastr.info(data.description, data.name, {
            closeButton: true,
            progressBar: true,
        });
        
        $('.project .add-item').show();
        
        thisproject=data;

    }
    
});

websocket.on('structure-all',function(data){
    
    $.smekta_file('views/smekta/sidebar-structure.html',data,'#left-sidebar',function(){
        $('#left-sidebar a.nav-dropdown-toggle').click(function(){
            $(this).parent().toggleClass('open');
        });
    });
    $.smekta_file('views/smekta/project-structure.html',data,'#project-structure',function(){
        $('#project-structure .translate').translate();
    });
   
});

websocket.on('structure',function(data){
    if (typeof(floorDraw)=='function') {
        floorDraw(data); 
    }    
});

websocket.on('floor-select',function(data){
    if (typeof(floorDrawElements)=='function') {
        console.log('floor is commig',data.data.length);
        floorDrawElements(data.data); 
    }    
});

websocket.on('devices-all', function(data) {
    if (typeof(devicesTableDraw)=='function' && $('.devicetable').length>0) {
        devicesTableDraw(data.data); 
    }
    buildAsideMenu(data.data);
});


websocket.on('files', function(dir,data) {
    if (typeof(displayFileList)=='function' ) {
        displayFileList(dir,data); 
    }
});


websocket.on('bus',function(haddr,state) {
    console.log('busReceive',haddr,'=',state);

    if (typeof(Device)!='undefined') {
        Device({name:''}).state(haddr,state);
    }
});


websocket.on('ios',function(data){
    if (typeof(loadIOs)=='function') {
        loadIOs(data); 
    }    
});

websocket.on('scripts',function(data){
    if (typeof(loadScripts)=='function') {
        loadScripts(data); 
    }    
});
