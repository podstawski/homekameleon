var chartsClass = function() {
    var epoch2date = function(epoch) {
        var d = new Date(epoch);
        //d.setMilliseconds(epoch);
       
        return d;
    };
    
    var getFullDate = function(epoch) {
        var d=epoch2date(epoch);
        
        var txt=d.getFullYear()+'-';
        var m=d.getMonth()+1;
        if (m<10) m='0'+m;
        txt+=m+'-';
        var day=d.getDate();
        if (day<10) day='0'+day;
        txt+=day;
    
        var h=d.getHours();
        if (h<10) h='0'+h;
        txt+=' '+h+':';
        var m=d.getMinutes();
        if (m<10) m='0'+m;
        txt+=m;
    
        return txt;
    }
    
    var getHour = function(epoch) {
        var d=epoch2date(epoch);
        
        var h=d.getHours();
        if (h<10) h='0'+h;
        else h+='';
        
        var m=d.getMinutes();
        if (m<10) m='0'+m;
        h+=':'+m;
        
        return h;
    }
    
    var prepareData = function(data,tables,min,max) {
        
        
        var delta=(max-min)/(1000*3600);
        
        
        var start=Math.floor(min/1000);
        var d=epoch2date(start*1000);
        
        var labels=[];
        
        var weighted_avg=true;
        
        if (delta<3) {
            var step=15*60*1000;

            if (d.getMinutes()%15==0) {
                if (d.getSeconds()>0) start+=15*60 - d.getSeconds(); 
            } else {
                start+=60*(15-d.getMinutes()%15) - d.getSeconds();
            }
            
            
        } else if (delta<=25) {
            var step=1200*1000;
            if (d.getMinutes()%60!=0) {
                start+=60*(60-d.getMinutes()%60);
            }
            
            start-=d.getSeconds();    
            
        } else if (delta<24*8) {
            var step=6*3600*1000;
            
            if (d.getMinutes()%180!=0) {
                start+=180*(180-d.getMinutes()%180);
            }
            start-=d.getSeconds(); 
            
        } else if (delta<24*32) {
            var step=24*3600*1000;
            
            if (d.getHours()%24!=0) {
                start+=24*(24-d.getHours()%24);
            }
            
            start-=d.getSeconds()-d.getMinutes()*60;
        } else {
            var step=8*24*3600*1000;
            //weighted_avg=false;
            
            if (d.getHours()%24!=0) {
                start+=24*(24-d.getHours()%24);
            }
            
            start-=d.getSeconds()-d.getMinutes()*60;
        }
        
        start*=1000;
        

  
        
        var datasets=[];
        var datasetsIndexes={};
        for (var t in data) {
       
            if (tables[t]==undefined) {
                console.log('Undefined series',t);
                continue;
            }
        
            datasetsIndexes[t]=datasets.length;
       
            datasets.push({
                label: tables[t].name,
                backgroundColor: tables[t].color,
                borderColor: tables[t].color,
                pointBackgroundColor: [],
                borderWidth: 2,
                id: t,
                data: [],
                data2:[]
            });
         
         
         
        }
        
        
        for (var epoch=start; epoch<=max; epoch+=step) {
            labels.push(epoch2date(epoch));
            
            for (var t in data) {
                var datarecord=[];
                var datarecord2=[];
                
                
                for(var i=0; i<data[t].data.length; i++) {
                    if (weighted_avg && Math.abs(data[t].data[i].date - epoch) <= (step/2) ) {
                        data[t].data[i].delta=Math.round(Math.abs(data[t].data[i].date - epoch)/1000);
                        datarecord.push(data[t].data[i]);
                        datarecord2.push(data[t].data[i]);
                    }
                    if (!weighted_avg
                        && new Date(data[t].data[i].date).getFullYear()==new Date(epoch).getFullYear()
                        && new Date(data[t].data[i].date).getMonth()==new Date(epoch).getMonth() ) {
                        datarecord.push(data[t].data[i]);
                        datarecord2.push(data[t].data[i]);
                    }
                }
                
                if (datarecord.length>0) {
                    /*
                     * Wyliczenie średniej ważonej ze wszystkich wyników
                     * im bliżej godziny z labela (epoch), tym wyższa waga
                    */
                    if (weighted_avg) {
                        datarecord = datarecord.sort(function(a,b){
                            return a.delta-b.delta;
                        });
                        datarecord2 = datarecord2.sort(function(a,b){
                            return a.delta-b.delta;
                        });
                    }
                    var total=0,total2=0;
                    var count=0;
                    var len=datarecord.length;
                    for (var i=0; i<len; i++) {
                        if (weighted_avg) {
                            count+=len-i;
                            total+=(len-i)*datarecord[i].value;
                            total2+=(len-i)*datarecord[i].value2
                        } else {
                            count++;
                            total+=datarecord[i].value;
                            total2+=datarecord[i].value2;
                        }

                    }
                    var value=Math.round((tables[t].multiplier||1)*100*total/count)/100;
                    var value2=Math.round((tables[t].multiplier||1)*100*total2/count)/100;
                    
                } else {
                    value=undefined;
                    value2=undefined;
                }
                
                
                
                datasets[datasetsIndexes[t]].data.push(value);
                datasets[datasetsIndexes[t]].data2.push(value2);
            }
        }
        
        
        
        
        var result={
            labels: labels,
            datasets: datasets,
            from: min,
            to: max
        };
        
      
        return result;
    }
    
    
    return {
        strtotime: function(str,plusday) {
            if (plusday==null) plusday=0;
            var plus=plusday*1000*3600*24;
            
            if(typeof(str)=='number') return str;
            if (str.match(/^[0-9]+$/)) {
                //console.log('epoch',str);
                return parseInt(str);
            }
            
            var d=new Date(str);
            return d.getTime() + plus;
            
        },
        prepareData: function(data,tables,min,max) {
            return prepareData(data,tables,min,max);
        }
    }
}

if (typeof(module)=='undefined') {
    var module={};
}
module.exports = chartsClass;