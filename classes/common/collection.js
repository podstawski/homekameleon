var dblite = require('dblite').withSQLite('3.8.6');
var fs = require('fs');

module.exports = function(path) {
    var avgs={},saves={},lastsaves={},values={},lastvacuums={};
    
    fs.stat(path,function(err,stat) {
        if (err!=null) {
            fs.closeSync(fs.openSync(path, 'w'));
        } 
    });
    
    var db=dblite(path);
    
    var round=function(n) {
        return Math.round(100*n)/100;  
    };
    
    var name=function(txt) {
        return txt.replace(/[,.-\/]+/g,'_');
    };
    
    /*
     * table:   name of table
     * avg:     how many results keep for average calc
     * save:    save every ... seconds even if data comes faster
     *
     * cb:      callback
     */
    
    var init = function (table,avg,save,cb) {
        avgs[table]=avg;
        saves[table]=save;
        lastsaves[table]=0;
        values[table]=[];
        lastvacuums[table]=0;
        
        var fields=" (date INTEGER PRIMARY KEY NOT NULL,value REAL NOT NULL)";
        var sql="CREATE TABLE IF NOT EXISTS "+name(table)+fields;
        db.query(sql,function(){
            var sql="SELECT max(date) FROM "+name(table);
            db.query(sql,function(data) {
                if (data[0]!=null && data[0][0]!=null && data[0][0].length>0) {
                    lastsaves[table]=parseInt(data[0][0]);
                    var sql="SELECT value FROM "+name(table)+" WHERE date="+lastsaves[table];
                    db.query(sql,function(data) {
                        if (data[0]!=null && data[0][0]!=null && data[0][0].length>0) {
                            if (typeof(cb)=='function') cb(table,round(parseFloat(data[0][0])));
                        } else if (typeof(cb)=='function') cb(table,null);
                    });
                }
                else if (typeof(cb)=='function') cb(table,null);
            });
        });
        var sql="CREATE TABLE IF NOT EXISTS "+name(table)+'_daily'+fields;
        db.query(sql,function(){
            vacuum(table);
        });
        
        
    };
    
    var avg = function (a) {
        var total=0;
        for (var i=0; i< a.length; i++) total+=parseFloat(a[i]);
        return round(total/a.length);
    };
    
    var avgvalue = function(a) {
        var total=0;
        for (var i=0; i< a.length; i++) total+=a[i].value;
        return round(total/a.length);
    };
    
    var vacuum = function(table) {

        var delete_before_days_ago=30;
        var now=Date.now();
        var d=new Date();

        if (now-lastvacuums[table] < 20*3600*1000) return; 
        now-=d.getMilliseconds() + 1000*d.getSeconds() + 60*1000*d.getMinutes();
        
        while (d.getHours()>0) {
            now-=3600*1000;
            d=new Date(now);
        }
        
        
        var deletebefore=now-(delete_before_days_ago+1)*24*3600*1000;
        var sql="DELETE FROM "+name(table)+" WHERE date<?";
        db.query(sql,[deletebefore],function(){
            var sql="VACUUM "+name(table);
            db.query(sql,function(){
                
                sql="SELECT max(date) FROM "+name(table)+"_daily";
                db.query(sql,function(result){
                    var date=parseInt(result[0][0]);
                    if (isNaN(date)) date=deletebefore;
                    while (true) {
                        date+=24*3600*1000;
                        if (date>=now) break;
                        
                        d=new Date(date);
                        if (d.getHours()==23) date+=3600*1000;
                        if (d.getHours()==1) date-=3600*1000;
                        
                        var date2=date+24*3600*1000;
                        
                        d=new Date(date2);
                        if (d.getHours()==23) date2+=3600*1000;
                        if (d.getHours()==1) date2-=3600*1000;
                        
                        get(table,date,date2,function(res){
                            if (res.count>0) {
                                sql="INSERT INTO "+name(table)+"_daily VALUES (?,?)";
                                var values=[res.from,avgvalue(res.data)];
                                db.query(sql,values);
                            }
                        });
                    }
                });           
            
            });
        });
        

    };
    
    var add = function(table,value,cb,ts) {
       
        if (value==null || table.length==0 || isNaN(value)) {
            if (typeof(cb)=='function') cb();
            return;
        }
        
        if (ts) {
            var sql="INSERT INTO "+name(table)+" VALUES (?,?)";
            var val=[ts,value];
            
            try {
                db.query(sql,val,cb);
            } catch(e) {
                console.log('ERROR:',e,sql,val);
            }
            
        } else {   
            var now=Date.now();
            values[table].push(value);
    
            if (now-lastsaves[table] >= saves[table]*1000) {
                
                var sql="INSERT INTO "+name(table)+" VALUES (?,?)";
                var val=[now,avg(values[table])];
                
                try {
                    db.query(sql,val,cb);
                    lastsaves[table]=now;
                    
                    while (values[table].length>avgs[table]) {
                        values[table].splice(0,1);
                    }
                    
                } catch(e) {
                    console.log('ERROR:',e,sql,val,values[table]);
                }
                
            } else {
                if (typeof(cb)=='function') cb();
            }
        }
        vacuum(table);


    };


    var get = function(table,from,to,cb) {
        
        var table_suffix = to-from > 10*24*3600*1000 ? '_daily' : '';
        var sql="SELECT date,value FROM "+name(table)+table_suffix+" WHERE date>=? AND date<=?";
        db.query(sql,[from,to],function(data){
        
            var result={table:table,
                count:data.length,
                from: from,
                to: to,
                min_date:data.length>0 ? data[0][0] : null,
                max_date:data.length>0 ? data[data.length-1][0] : null,
                data:[]
            };
            for (var i=0; i<data.length; i++) {
                result.data.push({date: parseInt(data[i][0]), value: round(parseFloat(data[i][1]))});
            }
            cb(result);
        });
    };
    
    
    return {
        add: function (table,v,cb,ts) {
            add(table,v,cb,ts);
        },
        init: function (table,avg,save,cb) {
            init(table,avg,save,cb);
        },
        inited: function (table) {
            return typeof(values[table])!='undefined';
        },
        round: function(number) {
            return round(number);
        },
        get: function(table,from,to,cb) {
            return get(table,from,to,cb);
        }
    }
}
