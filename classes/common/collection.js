var dblite = require('dblite').withSQLite('3.8.6');
var fs = require('fs');

module.exports = function(path) {
    var avgs={},saves={},lastsaves={},values={};
    
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
        return txt.replace(/[,.-]+/g,'_');
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
        var sql="CREATE TABLE IF NOT EXISTS "+name(table)+" (date INTEGER PRIMARY KEY NOT NULL,value REAL NOT NULL)";
        db.query(sql,function(){
            var sql="SELECT max(date) FROM "+name(table);
            db.query(sql,function(data) {
                if (data[0]!=null && data[0][0]!=null && data[0][0].length>0) {
                    lastsaves[table]=parseInt(data[0][0]);
                    var sql="SELECT value FROM "+name(table)+" WHERE date="+lastsaves[table];
                    db.query(sql,function(data) {
                        if (data[0]!=null && data[0][0]!=null && data[0][0].length>0) {
                            if (typeof(cb)=='function') cb(round(parseFloat(data[0][0])));
                        } else if (typeof(cb)=='function') cb(null);
                    });
                }
                else if (typeof(cb)=='function') cb(null);
            });
        });
    };
    
    var avg = function (a) {
        var total=0;
        for (var i=0; i< a.length; i++) total+=a[i];
        return round(total/a.length);
    }
    
    var add = function(table,value,cb) {
        if (value==null) {
            cb();
            return;
        }
        var now=Date.now();
        values[table].push(value);
        while (values[table].length>avgs[table]) {
            values[table].splice(0,1);
        }
        var sql="INSERT INTO "+name(table)+" VALUES (?,?)";
        var val=[now,avg(values[table])];
        if (now-lastsaves[table] >= saves[table]*1000) {
            db.query(sql,val,cb);
            lastsaves[table]=now;
        }
        
	//cb();
    };


    var get = function(table,from,to,cb) {
        var sql="SELECT date,value FROM "+name(table)+" WHERE date>=? AND date<=?";
        db.query(sql,[from,to],function(data){
        
            var result={table:table,
                count:data.length,
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
        add: function (table,v,cb) {
            add(table,v,cb);
        },
        init: function (table,avg,save,record,cb) {
            init(table,avg,save,record,cb);
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