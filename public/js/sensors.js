var drawBlock = function(data,tables_dest,charts) {
    $.smekta_file('views/table.html',data,null,function(html){
        var containers=[];
        var shadow=null;
        var table=$(html).appendTo(tables_dest);
        
        if (!charts) return;
        //table.css('cursor','move');
        table.css('cursor','pointer');
        table.click(function(){
            //console.log(data.id,$('#'+data.id).offset());
            $("html, body").animate({scrollTop: $('#'+data.id).offset().top-50}, 1000);
        });/*draggable({
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
        
        */
    });


};

var findElementUnderHelper = function(helper,elements) {
    var helper_height=80;
    var helper_width=helper.width();
    
    for (var i=0;i<elements.length;i++) {
        if (
            helper.offset().top+helper_height > elements[i].offset().top
            && helper.offset().top < elements[i].offset().top+elements[i].height()
            && helper.offset().left+helper_width > elements[i].offset().left
            && helper.offset().left < elements[i].offset().left+elements[i].width()
        ) {
            return elements[i];
        }
    }
    
    return null;
}


var requestChart = function(chart_array,from,period,id,update_from) {
    websocket.emit('chart',chart_array,from,period,id);
    if (update_from) {
        if (from==null) from=Date.now();
        if (typeof(from)=='object') from=new Date(from).getTime();
        update_from.attr('from',from);
        update_from.find('.navi a span').removeClass('vis');        
    }
    
    //console.log(from,new Date(from),typeof(from));
};




websocket.once('collections',function(tables){
    
    var tables_dest = $('.tables');
    var charts_dest = $('.charts');
    
    if (tables_dest.length>0) {
        tables_dest.html('');
        for (var id in tables) {
            tables[id].id=id.replace(/[,]/g,'_');
            tables[id].rel=id;
            tables[id].icon=typeof(tables[id].value)==='string' && tables[id].value.indexOf('°C')>0?'temp.png':'pressure.png';
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
            if (charts_dest.length>0) setTimeout(function(charts){
                requestChart(charts);
            },500,[id])
        }    
    }
    
});




var drawChart=function(data,id,newid,title,from) {
    var month='MMM';
    var day='ddd, D MMM';
    var hour='H:mm';
    var title_s='';
    
    switch (data.period) {
        case 'm12':
            var unit='month';
            var title_f='YYYY';
            break;
        case 'm1':
            var unit='day';
            var title_f='MMMM YYYY';
            day='D';
            break;
        case 'd7':
            var unit='day';
            var title_f='MMM YYYY, ww. ';
            title_s=$.translate('week');
            break;
        
        default: 
            var unit='hour';
            var title_f='D MMM YYYY';
            break;
    }
    
    $('#'+id).attr('ids',newid).attr('to',data.to).attr('period',data.period);
    
    if (!$('#'+id).attr('from')) {
        $('#'+id).attr('from',data.from);
    }
    
    if (title!=null) $('#'+id+' .panel-heading .title').text(title);
    var title_date='<span>'+moment(new Date(from)).format(title_f)+title_s+'</span>';
    $('#'+id+' .panel-heading .view').html($.translate('view-'+data.period)+title_date);
    
    
    
    var anydata=false;
    for (var i=0;i<data.datasets.length;i++) {
        for (var j=0; j<data.datasets[i].data.length; j++) {
            if (data.datasets[i].data[j]==null) {
                data.datasets[i].data[j]=undefined;
            }
            if (data.datasets[i].data[j]!=undefined) {
                anydata=true;
            }
        }
    }
    
    $('.chart-shadow').fadeOut(400,function(){
        $(this).remove();
    });
    
    var holder = document.getElementById(id+"-chart");
    var ctx = holder.getContext("2d");
    
    var chrt = new Chart(ctx, {
        type: 'line',
        data: data,
        options: {
            responsive: true,
            legend: {
                display: false  
            },
            scales: {
                xAxes: [{
                    type: 'time',
                    time: {
                        unit: unit,
                        displayFormats: {
                            month: month,
                            hour: hour,
                            day: day
                            
                        }
                    },
                    ticks: {
                        fontSize: 10
                    }
                }]}
        }
    });
    
    
    for (var i=0; i<chrt.config.data.labels.length; i++ ) {
        var col='rgba(255,255,0,0.5)';
        if(chrt.config.data.datasets[0].data2[i]>0) col='rgba(255,0,0,0.5)';
        if(chrt.config.data.datasets[0].data2[i]<0) col='rgba(0,0,255,0.5)';
        chrt.config.data.datasets[0].pointBackgroundColor.push(col);
    }
    chrt.update();
    
    var par=$(holder).closest('.chart-container');
    
    if (!anydata) {
        add_shadow(par,$.translate('No data'));
    }
    
    holder.onclick = function (e) {
        if (e.clientX-$(holder).offset().left < parseInt(chrt.chartArea.left)) return;
        var prc=(e.clientX-$(holder).offset().left - parseInt(chrt.chartArea.left))/chrt.chartArea.right;
        
        var multiplier=1;
        if (data.period=='m12') multiplier=1.05;
        
        var idx=Math.round(multiplier*prc*data.labels.length);
        if (idx>=data.labels.length) idx=data.labels.length-1;
        
        var selected_date=data.labels[idx];
        var pass=false;
        
        //console.log(selected_date,prc,data);
        for(var i=0; i<data.datasets.length; i++) {
            if (data.datasets[i].data[idx]) pass=true;
        }
        if (!pass) return;
        
        var period=null;
        if (data.period=='d7') period='d1';
        if (data.period=='m1') period='d7';
        if (data.period=='m12') period='m1';
        
        if (period==null) return;
        
        
        add_shadow(par);      
        requestChart(par.attr('ids').split('|'),selected_date,period,par.attr('id'),par);
    
        
    };
    return chrt;

};

websocket.on('chart',function(rawdata,tables,from,to,period,id){
    
    if (id!=null) {
        $('#'+id+' .today').removeClass('active');
        $('#'+id+' .period').removeClass('active');
        $('#'+id+' .period[rel="'+period+'"]').addClass('active');
        if (period=='d1') {
            var delta=(Date.now()-from)/(1000*3600);
            if (delta>0 && delta<24) $('#'+id+' .today').addClass('active');
        }    
    }

    
    var data=chartsObj.prepareData(rawdata,tables,from,to);
    data.period=period;
    
    
    var title='';
    var newid='';
    var dslen=data.datasets.length;
    for (var i=0; i<dslen; i++) {
        if (title.length>0) {
            title+=' + ';
            newid+='|';
        }
        title+=data.datasets[i].label;
        newid+=data.datasets[i].id;
        var sym=data.datasets[i].id;
        var showNoFrost=false;
        if (tables[sym].t_nofrost && tables[sym].t_eco) {
            
            
            for (var j=0;j<data.datasets[i].data.length; j++) {
                if (Math.abs(data.datasets[i].data[j] - tables[sym].t_nofrost) < Math.abs(data.datasets[i].data[j] - tables[sym].t_eco)) {
                    showNoFrost=true;
                    break;
                }
            }
        }
        
        
        if (showNoFrost) {
            data.datasets.push({
                backgroundColor: "rgba(0,0,0,0)",
                borderColor:"rgba(0,0,255,0.8)",
                borderWidth: 1,
                pointStyle: 'line',
                pointBorderWidth: 0,
                label: 'nofrost '+sym,
                data: new Array(data.datasets[i].data.length).fill(tables[sym].t_nofrost+tables[sym].t_hysteresis)
            });
            data.datasets.push({
                backgroundColor: "rgba(0,0,0,0)",
                borderColor:"rgba(0,0,255,0.8)",
                borderWidth: 1,
                pointStyle: 'line',
                pointBorderWidth: 0,
                label: 'nofrost '+sym,
                data: new Array(data.datasets[i].data.length).fill(tables[sym].t_nofrost-tables[sym].t_hysteresis)
            });
            
        }
        
        if (tables[sym].t_comfort) {
            data.datasets.push({
                backgroundColor: "rgba(0,0,0,0)",
                borderColor:"rgba(255,0,0,0.8)",
                borderWidth: 1,
                pointStyle: 'line',
                pointBorderWidth: 0,
                label: 'comfort '+sym,
                data: new Array(data.datasets[i].data.length).fill(tables[sym].t_comfort+tables[sym].t_hysteresis)
            });
            data.datasets.push({
                backgroundColor: "rgba(0,0,0,0)",
                borderColor:"rgba(255,0,0,0.8)",
                borderWidth: 1,
                pointStyle: 'line',
                pointBorderWidth: 0,
                label: 'comfort '+sym,
                data: new Array(data.datasets[i].data.length).fill(tables[sym].t_comfort-tables[sym].t_hysteresis)
            });
            
        }
        
        if (tables[sym].t_eco) {
            data.datasets.push({
                backgroundColor: "rgba(0,0,0,0)",
                borderColor:"rgba(0,255,0,0.8)",
                borderWidth: 1,
                pointStyle: 'line',
                pointBorderWidth: 0,
                label: 'eco '+sym,
                data: new Array(data.datasets[i].data.length).fill(tables[sym].t_eco+tables[sym].t_hysteresis)
            });
            data.datasets.push({
                backgroundColor: "rgba(0,0,0,0)",
                borderColor:"rgba(0,255,0,0.8)",
                borderWidth: 1,
                pointStyle: 'line',
                pointBorderWidth: 0,
                label: 'eco '+sym,
                data: new Array(data.datasets[i].data.length).fill(tables[sym].t_eco-tables[sym].t_hysteresis)
            });
            
        }
        
    }
    

    
    
    
    
    if (id==null) {
        id=newid.replace(/[,|]/g,'_');
        var x=600,y=220;
        if ($('body').width()<900) y=350;
        
        
        $.smekta_file('views/chart.html',{title:title, id:id, x:x, y:y},null,function(html){
            $('.charts').append(html);         
            charts[id]=drawChart(data,id,newid,null,from);
            //$('#'+id+' .translate').translate();
        
            if (typeof(chartReady)=='function') chartReady(id);
        });
    } else {
        charts[id].destroy();
        charts[id]=drawChart(data,id,newid,title,from);
    }
});

var add_shadow = function(container,txt) {
    
    var shadow=$('<div class="chart-shadow">'+(txt?'<span>'+txt+'</span>':'')+'</did>').appendTo('body');
    var panel=container.find('.panel-body');
    var navi=container.find('.navi a span');
    shadow.css({
        width: panel.width(),
        height: panel.height()+15,
        top: panel.offset().top+'px',
        left: (panel.offset().left + 15)+'px'
    }).fadeIn(500)
    if (txt) {
        navi.addClass('vis');
        shadow.click(function(){
            $(this).fadeOut(500);
        });
    }
}

$(document).on('click','.chart-container .navi a span',function(e){

    var par=$(this).closest('.chart-container');
    
    var from=parseInt(par.attr('from'));
    var period=par.attr('period');
    switch (period) {
        case 'm12':
            var plus=366*24*3600*1000 ;
            var minus=364*24*3600*1000 ;
            break; 
        case 'm1':
            var plus=32*24*3600*1000 ;
            var minus=27*24*3600*1000 ;
            break; 
        case 'd7':
            var plus=7*24*3600*1000 + 3601*1000;
            var minus=7*24*3600*1000 - 3601*1000;
            break;            
        default:
            var plus=25*3600*1000;
            var minus=23*3600*1000;
            break;
    }
    
    
    if ($(this).parent().hasClass('previous')) {
        add_shadow(par);
        requestChart(par.attr('ids').split('|'),from-minus,period,par.attr('id'),par);
    }
    
    if ($(this).parent().hasClass('next')) {
        add_shadow(par);
        requestChart(par.attr('ids').split('|'),from+plus,period,par.attr('id'),par);
    }
    
    
});

$(document).on('click','.chart-container .today',function(e){
    var par=$(this).closest('.chart-container');
    add_shadow(par);
    $('.chart-container .period[rel="d1"]').addClass('active');
    requestChart(par.attr('ids').split('|'),null,'d1',par.attr('id'),par);
});


$(document).on('click','.chart-container .period',function(e){
    var par=$(this).closest('.chart-container');
    var from=parseInt(par.attr('from'));
    var period=par.attr('period');
    
    add_shadow(par);
    requestChart(par.attr('ids').split('|'),from,$(this).attr('rel'),par.attr('id'));
});
