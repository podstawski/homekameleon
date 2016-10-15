var drawBlock = function(data,tables_dest,charts) {
    $.smekta_file('views/table.html',data,null,function(html){
        var containers=[];
        var shadow=null;
        var table=$(html).appendTo(tables_dest);
        
        if (!charts) return;
        table.css('cursor','move');
        table.click(function(){
            //console.log(data.id,$('#'+data.id).offset());
            $("html, body").animate({scrollTop: $('#'+data.id).offset().top-50}, 1000);
        }).draggable({
            helper: "clone",
            appendTo: ".tables-chart",
            containment: "parent",
            start: function(event, ui) {

                containers=[];
                ui.helper.parent().parent().find('.chart-container').each(function(){
                    containers.push($(this));
                });
                shadow=$('<div class="chart-shadow"></did>').appendTo('body');
            },
            drag: function(event, ui) {
                var container=findElementUnderHelper(ui.helper,containers);
                
                ui.helper.find('.panel-widget').each(function(){
                    var color =$(this).css('background-color');
                    if (container) {
                        color2=color.replace(/[0-9.]+\)/,'0.9)');
                        shadow.css({
                            'background-color':color,
                            'border-color': color2,
                            width: container.width(),
                            height: container.height(),
                            top: container.offset().top+'px',
                            left: container.offset().left+'px'
                        }).fadeIn(500);
                    } else {
                        shadow.fadeOut(500);
                    }
                });
                
            },
            stop: function(event, ui) {

                shadow.remove();
               
                var chart = findElementUnderHelper(ui.helper,containers);
                
                
                if (chart!=null) {
                
                    
                    if (chart.attr('id')==ui.helper.attr('chid')) {
                        console.log('Already drawn');
                    } else {
                        var ids=chart.attr('ids').split('|');
                        
                        var inArray = ids.indexOf(ui.helper.attr('rel'));
                        if (inArray==-1) ids.push(ui.helper.attr('rel'));
                        else ids.splice(inArray,1);
                        
                        add_shadow(chart);
                        requestChart(ids,null,null,chart.attr('id'));
                    }
                }
                
            }
        }); 
    });


};




websocket.once('collections',function(tables){
    
    var tables_dest = $('.tables');
    var charts_dest = $('.charts');
    
    if (tables_dest.length>0) {
        tables_dest.html('');
        for (var id in tables) {
            tables[id].id=id.replace(/[,]/g,'_');
            tables[id].rel=id;
            tables[id].icon=tables[id].value.indexOf('°C')>0?'temp.png':'pressure.png';
            if (tables[id].temp==-1) {
                tables[id].panel='blue';
            }
            if (tables[id].temp==0) {
                tables[id].panel='orange';
            }
            if (tables[id].temp==1) {
                tables[id].panel='red';
            }
            drawBlock(tables[id],tables_dest,charts_dest.length>0);
            if (charts_dest.length>0) requestChart([id]);
        }    
    }
    
});

