var ical = require('ical');

module.exports = function(logdir,scenario) {

    var calendars=[];
    var events=[];
    
    var convertTo24Hour = function (time) {
        
        var hours = parseInt(time.substr(0, 2));
        if(time.indexOf('am') != -1 && hours == 12) {
            time = time.replace('12', '0');
        }
        if(time.indexOf('pm')  != -1 && hours < 12) {
            time = time.replace(hours, (hours + 12));
        }
        return time.replace(/(am|pm)/, '');
    }
    

    return {
        reggister: function(cals) {
            calendars=cals;
        },
        
        update: function() {
            var now=Date.now();
            var backup=events.slice(0,events.length);
            events=[];
            for (var i=0;i<calendars.length;i++) {
                ical.fromURL(calendars[i], {}, function(err, data) {

                    if (typeof(err)!='undefined') {
                        events=backup.slice(0,backup.length);
                        return;
                    }
                    
                    for (var k in data){
                        if (data.hasOwnProperty(k)) {
                            var ev = data[k];
                            var start=ev.start.getTime();
                            
                            if (start<now) continue;
                            if (start>now+24*3600*1000) continue;
                            var duration=(ev.end.getTime() - ev.start.getTime())/3600000;
                            
                            if (duration>=23 && duration<=25) {
                            
                                if (ev.summary.indexOf('unrise')>=0 && ev.summary.indexOf('unset')>=0) {
                                    console.log(ev.summary);
                                    var a=ev.summary.split(',');
                                    for (var j=0;j<a.length; j++) {
                                        a[j]=a[j].trim();
                                        var colon=a[j].indexOf(':');
                                        if (colon>0) {
                                            console.log(a[j].substr(0,colon));
                                            var today = new Date().toString();
                                            var colon2=today.indexOf(':');
                                            today=today.substr(0,colon2-2).trim();
                                            var str=today+' '+convertTo24Hour(a[j].substr(colon+1)).trim()+' GMT';
                                        
                                            var d=new Date(Date.parse(str));
                                        
                                            if (d.getTime()<now) continue;
                                            var id=scenario.find(a[j].substr(0,colon));
                                            if (id!=null) {
                                                events.push({when:d,scenario:id});
                                            }
                                            
                                        }
                                        
                                    }
                                }
                            }
                            
                            //console.log(ev,duration);
                          
                        }
                    }                
                
                
                });
            }
            
        },
        
        run: function() {
            
        }
    }
}