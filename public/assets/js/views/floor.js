/**
 * @author Piotr Podstawski <piotr@webkameleon.com>
 */


var polygonMode=false;
var polygonPoints=[];
var elements=[];
var lastDragEvent=0;
var thisfloor=0;
var dotW=16;
var dotH=16;
var uploadImage=null;
var originalSvgWidth;
var callingDevice;
var lastDraggedElement=null;
var editmode=false;
var deviceRatio=5;
var minDeviceRatio=3;
var maxDeviceRatio=10;

var lastFloorDebugTxt='';

var floorDebug=function(txt) {
    if (lastFloorDebugTxt!=txt) {
        $('#floor-container .draggable-container .floor-debug-container .floor-debug-contents').append('<p>'+txt+'</p>');
    }
    lastFloorDebugTxt=txt;
}

var modalCleanup = function() {
    lastDraggedElement=null;
    $('#edit-element').removeClass('aside-edit');
    $('#edit-element').removeClass('device-edit');
    $('#edit-element').removeClass('control-edit');
    $('#edit-element').removeClass('polygon-edit');
};


var zoomContainer = function(z,set) {
    
    var sel='#floor-container .draggable-container';
    var current=$(sel).css('zoom');

    if (current===undefined) {
        current=$(sel).css('-moz-transform');
        if (current===undefined || current=='none') current=1;
        else {
            current=current.substr(7);
            current=current.split(',');
            current=parseFloat(current[0]);
        }
    } else if (current.indexOf('%')>0) {
        current=current.replace('%','');
        current=parseFloat(current)/100;
    } else {
        current=parseFloat(current);
    }
 
    
    if (z!=null) {
        current*=z;
        if (set!=null) current=set;
        $(sel).css('-moz-transform','scale('+current+')');
        $(sel).css('zoom',current);
        
    }    
    
    return current;    

}

var devicesStateEmiter = function(addr,state) {
    if (addr==null) return !editmode;
    busSend(addr,state);
}


var pointInPolygonCheck = function (point, vs) {
    // ray-casting algorithm based on
    // http://www.ecse.rpi.edu/Homepages/wrf/Research/Short_Notes/pnpoly.html

    var x = point[0], y = point[1];

    var inside = false;
    for (var i = 0, j = vs.length - 1; i < vs.length; j = i++) {
        var xi = vs[i][0], yi = vs[i][1];
        var xj = vs[j][0], yj = vs[j][1];

        var intersect = ((yi > y) != (yj > y))
            && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }

    return inside;
};

var roomOfDevice = function(obj) {
    for (var i=0; i<elements.length; i++) {
        if (elements[i].type!='polygon') continue;
        var points=[];
        for (var j=0; j<elements[i].points.length; j++) {
            points.push([elements[i].points[j].x,elements[i].points[j].y]);
        }
        var p1=calculatePoint({x:parseInt(obj.css('left')),y:parseInt(obj.css('top'))});
        var p2=calculatePoint({x:parseInt(obj.css('left'))+parseInt(obj.css('width')),y:parseInt(obj.css('top'))});
        var p3=calculatePoint({x:parseInt(obj.css('left'))+parseInt(obj.css('width')),y:parseInt(obj.css('top'))+parseInt(obj.css('height'))});
        var p4=calculatePoint({x:parseInt(obj.css('left')),y:parseInt(obj.css('top'))+parseInt(obj.css('height'))});
        
        if (pointInPolygonCheck([p1.x,p1.y],points)) return elements[i].id; 
        if (pointInPolygonCheck([p2.x,p2.y],points)) return elements[i].id; 
        if (pointInPolygonCheck([p3.x,p3.y],points)) return elements[i].id; 
        if (pointInPolygonCheck([p4.x,p4.y],points)) return elements[i].id; 
        
    }
    return null;    
}


var calculatePoint = function(p) {
    var zoom=zoomContainer();
    var w=parseFloat($('#floor-container .draggable-container').width());
    var h=parseFloat($('#floor-container .draggable-container').height());
    
    if (p.x > 1) {
        var point={
            x: (p.x)/(w*zoom),
            y: (p.y)/h
        };
    } else {
        var point={
            x: p.x*w*zoom,
            y: p.y*h
        };
    }
    
    //console.log(p.x,p.y,'->',point.x,point.y,'w:'+w,'h:'+h,zoom);
    
    return point;
}



var moveElements = function() {
   
    for (var i=0;i<elements.length;i++) {
        switch (elements[i].type) {
            case 'polygon': {
                elements[i].element.remove();
                drawPolygon(elements[i].points,elements[i].id,elements[i].name,elements[i]);
                break;
            }
            default: {
                drawDeviceElement(elements[i].data,elements[i]);
                break;
            }
            
        }
       
    }
    

}

var drawPolygonPoints = function() {

    
    var xs=[];
    for (var i=0; i<polygonPoints.length; i++) {
    
        xs.push(polygonPoints[i].x);
        var p=calculatePoint(polygonPoints[i]);
        var x=p.x - (dotW/2);
        var y=p.y - (dotH/2);
        
        polygonPoints[i].dot.css({left: x, top: y});
        
    }
    

}


var calculateWH = function () {
    
    var top=270;
    
    top=-300;
    
    var height=parseInt($(window).height())-top;
    if (height<200) height=200;
    
    //$('#floor-container').height(height);
    $('img.svg').width($('#floor-container').width());
    
    floorDebug('SVG width: '+$('#floor-container').width()+', container: '+$('#floor-container .draggable-container').width());
    
    
    drawPolygonPoints();
    moveElements();
}

var drawPolygon = function(points,id,name,element) {
    
    var points2=[],p='';
    for (var i=0; i<points.length; i++) points2.push(calculatePoint(points[i]));

    var minx=0,miny=0,maxx=0,maxy=0;

    
    for (var i=0; i<points2.length; i++) {
        
        //align to lines:
        for (var j=0; j<i; j++) {
            if (Math.abs(points2[i].x-points2[j].x)<10) points2[i].x=points2[j].x;
            if (Math.abs(points2[i].y-points2[j].y)<10) points2[i].y=points2[j].y;
        }
        //calculate bounds:
        if (points2[i].x<minx || minx==0) minx=points2[i].x;
        if (points2[i].y<miny || miny==0) miny=points2[i].y;
        if (points2[i].x>maxx ) maxx=points2[i].x;
        if (points2[i].y>maxy ) maxy=points2[i].y;
              
    }
    
    for (var i=0; i<points2.length; i++) {
        p+=Math.round(points2[i].x - minx) + ',' + Math.round(points2[i].y - miny) + ' ';
    }
    
    var polygon='<div class="polygon element"><svg><polygon points="'+p.trim()+'"/></svg></div>';

    var poli = $(polygon).appendTo('#floor-container .draggable-container').css({left: minx, top:miny});
    poli.width(maxx-minx);
    poli.height(maxy-miny);

    if (id==null) id=0;
    if (name==null) name='';
    
    poli.attr('id',id);
    poli.attr('title',name);
    
    if(element==null) {
        element={
            type:'polygon',
            element:poli,
            points: points,
            id:id,
            name:name
        };
        elements.push(element);
    } else {
        element.element=poli;
    }
    
    poli.dblclick(function(e){
        if (!editmode) return;
    
        modalCleanup();
        $('#edit-element').addClass('polygon-edit');
        $('#edit-element .modal-header input').val(name);
        $('#edit-element').attr('rel',id);
        $('#edit-element .modal-body').html('');
        $('#edit-element').modal('show');
        
        uploadImage=null;
        
        $.smekta_file('views/smekta/floor-polygon.html',element,'#edit-element .modal-body',function(){
            $('#edit-element .modal-body .translate').translate();
        });
        
        
    });
    return poli;
}


var drawDeviceElement = function(data,element) {
    
    if (!element) { 
        if (data.point.x<0 || data.point.y<0) {
            if (data.id) websocket.emit('db-remove','floor',data.id);
            return;
        }
        var device=new Device(data, zoomContainer, devicesStateEmiter);
        device.parent($('#floor-container .draggable-container'));
        element={device: device, type: 'device', data: data, id: data.id};
        elements.push(element);

    } else {
        var device=element.device;
    }
    
    var ratio=0.1*deviceRatio*$('#floor-container').width()/originalSvgWidth;
    
    device.draw({
        stop: function(e,ui) {

            var d={id:data.id};
            var p=$(this).position();
            
            p.x=p.left;
            p.y=p.top;
            d.point=calculatePoint(p);
            d.room=roomOfDevice($(this));
            
            websocket.emit('db-save','floor',d);
            lastDraggedElement={id: data.id,element: $(this)};
        },
        dblclickDevice: function(e) {
            if (!editmode) return;
            modalCleanup();
            $('#edit-element').addClass('device-edit');
            $('#edit-element .modal-header input').val(data.name);
            $('#edit-element').attr('rel',data.id);
            $('#edit-element .modal-body').html('');
            $('#edit-element').modal('show');
            
            uploadImage=null;
            
            calculateLabelForSmekta(data,data.type);
            
            $.smekta_file('views/smekta/floor-device.html',data,'#edit-element .modal-body',function(){
                $('#edit-element .modal-body .translate').translate();
            });
        },
        dblclickControl: function (e) {
            if (!editmode) return;
            modalCleanup();
            $('#edit-element').addClass('control-edit');
            $('#edit-element .modal-header input').val(data.name);
            $('#edit-element').attr('rel',data.id);
            $('#edit-element .modal-body').html('');
            $('#edit-element').modal('show');
            
            var cdata={};
            for (var i=0; i<this.attributes.length; i++) {
				var attr=this.attributes[i].nodeName;
				var val=this.attributes[i].nodeValue;
                cdata[attr]=val;
            }
            
            var children=$(this).parent().children();
            for (var i=0; i<children.length; i++) {
                if (children[i]==this) {
                    $('#edit-element').attr('rel2',i);
                }
            }
            
            $.smekta_file('views/smekta/floor-control.html',cdata,'#edit-element .modal-body',function(){
                $('#edit-element .modal-body .translate').translate();
            });
        }
    },ratio);
    
    element.element = device.dom();
    device.dom().addClass('element');
    if (!editmode) device.dom().draggable('disable');
    
    var point=calculatePoint(data.point);
    
    device.dom().css({
        top:point.y,
        left:point.x
    });
    
    return device.dom();
}

var removePolygonPoints=function() {
    for (var i=0; i<polygonPoints.length; i++) {
        polygonPoints[i].dot.remove();
        delete(polygonPoints[i].dot);
    }
    polygonPoints=[]; 
};

var createPolygonFromPoints = function() {
    
    drawPolygon(polygonPoints);

    
    polygonMode=false;
    $('.breadcrumb .icon-note').removeClass('active');
    $('#floor-container .draggable-container .element').show();    
    
    websocket.emit('db-save','floor',{floor: thisfloor, type:'polygon', points:polygonPoints});
    removePolygonPoints();
}



var floorDraw=function(data) {
    
    if (data.description===undefined) {
        data.description=$('.sidebar .sidebar-header strong').text();
    }
    
    $('.page-header .page-title').text(data.name);
    $('.page-header .page-desc').text(data.description);
    
    document.title=data.description+': '+data.name;
    
    if (typeof(data.parent)=='undefined' || data.parent==null) {
        setBreadcrumbs([{name: data.description, href:'project.html,'+data.project},
                       {name: data.name, href:'floor.html,'+data.id}]);
    }
    
    $('#floor-container img.svg').attr('src',data.img).load(function(){
        originalSvgWidth=$(this).width();
        calculateWH();
        websocket.emit('db-select','floor',[{floor:thisfloor}]);
    });
    
    
    $('#floor-container .svg').click(function(e){
        
        if (polygonMode && Date.now()-lastDragEvent>1500) {
            var zoom=zoomContainer();
            var ex = parseFloat(e.offsetX === undefined ? e.originalEvent.layerX : e.offsetX);
            var ey = parseFloat(e.offsetY === undefined ? e.originalEvent.layerY : e.offsetY);
            var w=parseFloat($('#floor-container').width());
            var h=parseFloat($('#floor-container .draggable-container').height());
            var point={
                x:(ex/zoom)/w,
                y:(ey/zoom)/h
            }
            
            var img='<img src="assets/img/dot.png" class="polygon-dot"/>';
            
            
            point.dot=$(img).css({left: -1*dotW, top: -1*dotH}).appendTo('#floor-container .draggable-container');
            
            polygonPoints.push(point);
            point.dot.attr('title',polygonPoints.length);
            point.dot.click(createPolygonFromPoints);
            drawPolygonPoints();
        }
    
    });
    
    
}


var floorDrawElements=function(data) {
        
    if (data.length==0) return;
    if (data[0].floor!=thisfloor) return;
    
    for(var i=0;i<elements.length;i++) {
        elements[i].toBeDeleted=true;
    }
    
    for(var i=0;i<data.length;i++) {
        var matchFound=false;
        for(var j=0; j<elements.length; j++) {
            if (data[i].id == elements[j].id) {
                elements[j].toBeDeleted=false;
                if (data[i].type=='polygon') {
                    for( var k in data[i]) elements[j][k]=data[i][k];
                } else {
                    for( var k in data[i]) elements[j].data[k]=data[i][k];
                }
                
                matchFound=true;
                break;
            }
        }
   
        if (!matchFound) {
            if (typeof(data[i].name)=='undefined') data[i].name='';
        
            
            switch (data[i].type) {
                case 'polygon': {
                    drawPolygon(data[i].points,data[i].id,data[i].name);
                    break;
                }
                default: {
                    var dom=drawDeviceElement(data[i]);
                    
                    if (typeof(data[i].room)=='undefined'|| data[i].room==null) {
                        setTimeout(function(dom,data){
                            var room=roomOfDevice(dom);
                            if (room!=null) {
                                data.room=room;
                                websocket.emit('db-save','floor',data);           
                            }
                        },1000,dom,data[i]);
                        
                    }
                    
                    break;
                }
            }        
            
        }
        
        
    }

    
    
    for(var i=0;i<elements.length;i++) {
        
        if (typeof(elements[i].toBeDeleted)!='undefined' && elements[i].toBeDeleted) {
            elements[i].element.remove();
            elements.splice(i,1);
            i--;
        }
    }    
    
    moveElements();
    
    websocket.emit('bus');
    
}

var calculateLabelForSmekta = function(data,symbol) {
    var vattr=globalDevices[symbol].vattr||'';
    data.label_name='';
    if (vattr.length>0) {
        var attr=vattr.split(':');
        data.label_name=attr[0];
        if (attr.length>1) {
            data.select=[];
            var select=attr[1].split('|');
            for(var i=0;i<select.length;i++) {
                data.select.push({
                    value: select[i],
                    selected: select[i]==data.label
                });
            }
        }
    }
}


/*
 *draw devices in right sidebar
 */

var drawAsideDevices = function() {
    $('aside .device-element').each(function(){
        $(this).text('');
        var symbol=$(this).attr('rel');
        var device=new Device(globalDevices[symbol],zoomContainer);
        device.parent($(this));
        device.draw({
            helper: "clone",
            appendTo: "body",
            stop: function(e,ui) {
                var ctn=$('#floor-container');
                
                if (ui.offset.top>ctn.offset().top
                    &&
                    ui.offset.top<ctn.offset().top+ctn.height()
                    &&
                    ui.offset.left>ctn.offset().left
                    &&
                    ui.offset.left<ctn.offset().left+ctn.width()
                    ){
                        var zoom=zoomContainer();
                        var w=parseFloat($('#floor-container').width());
                        var h=parseFloat($('#floor-container .draggable-container').height());
                        
                        ctn=$('#floor-container .draggable-container');
                        
                        var data=device.attr();
                        
                        data.point={
                            x:((ui.offset.left - ctn.offset().left)/zoom)/w,
                            y:((ui.offset.top - ctn.offset().top)/zoom)/h
                        }
                        

                        data.floor=thisfloor;
                        data.type=symbol;
                        data.controls=globalDevices[symbol].controls||[];
                        
                        websocket.emit('db-save','floor',data);
                    
                }
                
            }
            
        });
        
        device.dom().dblclick(function(){
            
            if (!editmode) return;
            
            callingDevice=device;
            modalCleanup();
            $('#edit-element').addClass('aside-edit');
            $('#edit-element input[name="name"]').val(device.attr('name'));                        
            $('#edit-element').modal('show');
            
            var data={label:device.attr('label')};
            
            calculateLabelForSmekta(data,symbol);            
            
            $.smekta_file('views/smekta/aside-device.html',data,'#edit-element .modal-body',function(){
                $('#edit-element .modal-body .translate').translate();
            });
            
        });
    });
    
}

var printFloor = function (start) {
    floorDebug('Prn: p: '+$('.draggable-container').position().left+' x '+$('.draggable-container').position().top+', w: '+$('#floor-container').width()+', '+$('.draggable-container').width());
    zoomContainer(1,1);
    $('.draggable-container').css({left:0, top:0});
    calculateWH();
}


$(function(){

    var hash=window.location.hash;
    hash=hash.split(',');
    if (hash.length>1 && parseInt(hash[1])>0) {
        thisfloor=parseInt(hash[1]);
        websocket.emit('db-get','structure',thisfloor);
    }
    
    websocket.emit('db-get','devices');

    var icon_selector='.breadcrumb .breadcrumb-menu i.icon-note';
    $(icon_selector).removeClass('active');
    
    $('.breadcrumb .btn-floor').not('.edit-mode-only').fadeIn(200);
   
    

    

    
    
    if (typeof($.breadcrumbIconClick)=='undefined') {
        $.breadcrumbIconClick=true;

        /*
         *draw polygon mode toggler
         */
        $(document).on('click',icon_selector,function(){
            if (polygonMode) {
                polygonMode=false;
                $(icon_selector).removeClass('active');
                $('#floor-container .draggable-container .element').show();
                removePolygonPoints();
            } else {
                polygonMode=true;
                $(icon_selector).addClass('active');
                $('#floor-container .draggable-container .element').hide();
            }
        });
        
        $(document).on('click','.breadcrumb .breadcrumb-menu i.icon-printer',function(){
            $('body').removeClass('sidebar-nav');
            $('.breadcrumb').hide();
            
            window.print();
        });
        
        $(document).on('click','.breadcrumb .edit-mode-toggle',function(){
            $(this).toggleClass('active');
            $(this).children().toggleClass('active');
            editmode=$(this).hasClass('active');
            
            if (editmode) {
                $('.breadcrumb .edit-mode-only').show();
                $('#floor-container .draggable-container .device-container').draggable('enable');
            } else {
                $('.breadcrumb .edit-mode-only').hide();
                $('#floor-container .draggable-container .device-container').draggable('disable');
            }
        });      
        
        $(document).on('click','.breadcrumb .aside-toggle',function(){
            $(this).children().toggleClass('active');
        });
        
        $(document).on('click','.breadcrumb .device-plus',function(){
            if (deviceRatio<=maxDeviceRatio) {
                deviceRatio++;
                moveElements();
            }
            
        });

        $(document).on('click','.breadcrumb .device-minus',function(){
            if (deviceRatio>=minDeviceRatio) {
                deviceRatio--;
                moveElements();
            }
            
        });

        
        $(document).keydown(function(e){
            
            if (lastDraggedElement && e.which>=37 && e.which<=40) {
                event.preventDefault();
                
                var d={id:lastDraggedElement.id};
                var p=lastDraggedElement.element.position();
                
                if (p.top>0 || p.left>0) {
                
                    
                    if (e.which==37) p.left=Math.round(p.left)-1;
                    if (e.which==38) p.top=Math.round(p.top)-1;
                    if (e.which==39) p.left=Math.round(p.left)+1;
                    if (e.which==40) p.top=Math.round(p.top)+1;
                    
                    
                    p.x=p.left;
                    p.y=p.top;
                    d.point=calculatePoint(p);
        
                    websocket.emit('db-save','floor',d);
                }
            }
        });
        
    }

    $('#floor-container .draggable-container').draggable({
        stop: function() {
            lastDragEvent=Date.now();
        }
    });
    
    $('#floor-container .draggable-container .floor-debug-container').draggable();
    $('#floor-container .draggable-container .floor-debug-container a').click(function(){
        $(this).parent().remove();
    });
    
    /*
     *mousewheel: zoom in/out view
     */
    $('#floor-container .draggable-container').bind('mousewheel', function(e){
        
        if(e.originalEvent.wheelDelta /120 > 0) zoomContainer(1.1);
        else zoomContainer(0.9);
        
    }).bind('DOMMouseScroll',function(e) {
        if (e.detail<0) zoomContainer(1.1);
        if (e.detail>0) zoomContainer(0.9);
        
    });   
    
    

    if ($.calculateWHbound===undefined) {
        $.calculateWHbound=true;
        $(window).bind('resize', function() {
            if (window.location.hash.indexOf('floor')>=0) {
                calculateWH(); 
            }
            
        });
    
    }

    
    
    /*
     *save element
     */
    $('#edit-element .btn-info').click(function(){
        
		$('#edit-element').modal('hide');
		var data={id:$('#edit-element').attr('rel')};
		
        if (!$('#edit-element').hasClass('control-edit')) {
            $('#edit-element input,#edit-element select').each(function(){
                data[$(this).attr('name')]=$(this).val();
            });
        }
        
        if ($('#edit-element').hasClass('polygon-edit')) {
            if (uploadImage!=null) {
                data.img=uploadImage;
            }
            
            websocket.emit('db-save','floor',data);
        }
        
        if ($('#edit-element').hasClass('aside-edit')) {
            for (var k in data) {
                if (data[k]!==undefined) {
                    callingDevice.attr(k,data[k]);
                }
            }
            callingDevice.draw();
        }
            
            
        if ($('#edit-element').hasClass('device-edit')) {
                
            if (uploadImage!=null) {
                data.img=uploadImage;
            }
            
            
            for (var i=0; i<elements.length; i++) {
                if (elements[i].id==data.id && elements[i].device!==undefined) {
                    for(var k in data) {
                        elements[i].device.attr(k,data[k]);
                    }
                    elements[i].device.draw();
                }
            }
            
            websocket.emit('db-save','floor',data);            
        } 
        

        if ($('#edit-element').hasClass('control-edit')) {

            
            for (var i=0; i<elements.length; i++) {
                if (elements[i].id==data.id && elements[i].device!==undefined) {
                    data.controls = elements[i].data.controls;
                    break;
                }
            }

            var rel2=$('#edit-element').attr('rel2');
            
            $('#edit-element input,#edit-element select').each(function(){
                data.controls[rel2][$(this).attr('name')]=$(this).val();
            });
            
            
            websocket.emit('db-save','floor',data);
        }
        

        
    });
    
    $('#confirm-delete .btn-danger').click(function () {
        $('#confirm-delete').modal('hide');
        $('#edit-element').modal('hide');
        websocket.emit('db-remove','floor',$('#edit-element').attr('rel'));
    });
    
    
    $('#img-input').on('change',function(){
		var d=$('#img-input').prop('files')[0];
		if (typeof(d)!='undefined') {
			var file_reader = new FileReader();
			file_reader.readAsDataURL(d);
			
			file_reader.onload = function() {
				uploadImage=file_reader.result;
				$('#edit-element .img-input img').attr('src',uploadImage);
			};
		}
	
	
	});
    

    

});
