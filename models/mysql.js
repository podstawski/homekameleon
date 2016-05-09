var mysql = require('mysql');

var connections={};

var Model = function(opt,logger) {
    var connection=null;
    var _fields;
    var inited=false;
    
    if (logger==null) logger=console;

    var connect = function (cb) {
        var token=opt.host+':'+opt.database;
        if (connection!=null) {
            cb();
        } else if (connections[token]!==undefined){
            connection=connections[token];
            cb();
        } else {
            connection=mysql.createConnection(opt);
            connection.connect(function(err){
                if(!err) {
                    connections[token]=connection;
                    logger.log('Database '+opt.database+' is connected','db');
                    cb();
                } else {
                    connection=null;
                    logger.log('Error connecting database '+opt.database,'error',err);
                }
            });        
        }
    }
    
    var getFields = function(cb) {
        
        var sql="SELECT column_name,data_type FROM information_schema.columns WHERE table_schema='"+opt.database+"' AND table_name='"+opt.table+"'";
        connection.query(sql, function(err, rows, fields) {
            _fields={};
            for (var i=0; i<rows.length; i++) {
                _fields[rows[i].column_name]=rows[i].data_type;
            }
            if (cb) cb();
        });
    }
    
    var addslashes = function(key,val) {
        var type=_fields[key];
        
        switch (type) {
            case 'int': {
                return val;
            }
            default: {
                return "'"+val+"'";
            }
        }
    }
    
    var indexCondition = function (idx) {
        var where='';
        
        if (typeof(idx)=='object') {
            for (var i=0;i<opt.index.length; i++) {
                if (where.length>0) where+=' AND ';
                where+=opt.index[i]+'='+addslashes(opt.index[i],idx[opt.index[i]]);
            }
        } else {
            where=opt.index[0]+'='+addslashes(opt.index[0],idx);
        }
        
        return where;
    };
    
    var addFieldSql = function (k,v,cb) {
        sql='ADD COLUMN '+k+' ';
        var type=typeof(v);
        if (v==null) type='number';
        
        switch (type) {
            case 'number': {
                if (String(v).indexOf('.')>0) {
                    sql+='float(6)';
                } else {
                    sql+='bigint';    
                }
                
                break;
            }
            default:
                sql+='text';
        }
        
        
        return sql;

        
    };
    
    var checkFields = function (d,cb) {
        var sql='';
    
        for (var k in d) {
            if (typeof(_fields[k])=='undefined') {
                sql+=addFieldSql(k,d[k])+',';
            }
        }
        if (sql.length==0) {
            cb();
        } else {
            
            sql='ALTER TABLE '+opt.table+' '+sql.substr(0,sql.length-1);
            connection.query(sql, function(err, rows) {
                if (!err) {
                    getFields(cb);
                }
            });            
        }
       
    }
    
    var where2whereObj = function(where,cb) {
        var obj={};
        for (var i=0; i<where.length; i++) {
            for (var k in where[i]) {
                obj[k]=where[i][k];
            }
        }
        
        
        checkFields(obj,function(){
            var ors=[],ands;
            var v=[];
            for (var i=0; i<where.length; i++) {
                ands=[];
                for (var k in where[i]) {
                    if (where[i][k]!=null) {
                        if (typeof(where[i][k])=='object') {
                            ands.push(k+where[i][k][0]+'?');
                            v.push(where[i][k][1]);
                        } else {
                            ands.push(k+'=?');
                            v.push(where[i][k]);
                        }
                    } else {
                        ands.push(k+' IS NULL');
                    }
                }
                ors.push('('+ands.join(' AND ')+')');
            }
            cb({where:ors.join(' OR '),values:v});
            
        });
    };
    
    
    var json=function(obj) {
        for (var k in obj) {
            if (obj[k]==null) continue;
            
            if (typeof(obj[k])=='object') {
                obj[k]='json:'+JSON.stringify(obj[k]);
            } else if (typeof(obj[k])=='string' && obj[k].substr(0,5)=='json:') {
                obj[k]=JSON.parse(obj[k].substr(5));
            }
        }
        return obj;
    }
    
    var jsona=function(a) {
        for (var i=0; i<a.length; i++) json(a[i]);
        
        return a;
    }

    var getOne=function(idx,cb) {
        var sql="SELECT * FROM "+opt.table+" WHERE "+indexCondition(idx);
        connection.query(sql,function(err,rows) {
            if (!err && rows.length>0) cb(json(rows[0]));
            else cb(null);
        });          
        
    };


    
    return {
        init: function (cb) {
            connect(function(){
                var sql='SELECT * FROM information_schema.tables WHERE table_schema = \''+opt.database+'\' AND table_name = \''+opt.table+'\' LIMIT 1;';
                connection.query(sql, function(err, rows, fields) {
                    if (rows.length==0) {
                        sql='CREATE TABLE '+opt.table+' (';
                        for (var i=0;i<opt.index.length;i++) {
                            sql+=opt.index[i]+' INT(6) UNSIGNED AUTO_INCREMENT PRIMARY KEY, ';
                        }
                        sql+='_created BIGINT, ';
                        sql+='_updated BIGINT';
                        sql+=') DEFAULT CHARACTER SET=utf8;';
                        connection.query(sql,function() {
                            inited=true;
                            getFields(cb);
                        });
                    } else {
                        inited=true;
                        getFields(cb);
                    }
                    
                });

            });
        },
        
        getAll: function(cb) {
            var sql='SELECT * FROM '+opt.table;
            connection.query(sql, function(err, rows, fields) {
                cb({recordsTotal:rows.length,data:jsona(rows)});
            });
            
        },
        
        get: function(idx,cb) {
            return getOne(idx,cb);
        },
        
        select: function (where,order,cb,ctx) {
            var sql="SELECT * FROM "+opt.table;
            var orderby='';
            if (order) orderby=' ORDER BY '+order.join(',');
            
            if (where) {
                where2whereObj(where,function(obj){
                    sql+=' WHERE '+obj.where;
                    
                    connection.query(sql+orderby,obj.values,function(err, rows) {
                        if (!err) cb({recordsTotal:rows.length,data:jsona(rows),ctx:ctx});
                        else cb({recordsTotal:0,data:[],ctx:ctx});
                    });
                });
            } else {
                 connection.query(sql+orderby,function(err, rows) {
                    if (!err) cb({recordsTotal:rows.length,data:jsona(rows),ctx:ctx});
                    else cb({recordsTotal:0,data:[],ctx:ctx});
                });
            }
        },
        
        set: function(d,idx,cb) {
            if (idx==null) {
                idx=d[opt.index[0]];
            } else if (typeof(idx)=='function') {
                cb=idx;
                idx=d[opt.index[0]];
            }
            
            var set='_updated=?';
            var values=[Date.now()];
            
            json(d);
            checkFields(d,function(){
                for (var k in d) {
                    if (k=='_updated' || k=='_created') {
                        continue;
                    }
                    
                    set+=', '+k+'=?';
                    values.push(d[k]);
                }
                            
                var sql='UPDATE '+opt.table+' SET '+set+' WHERE '+indexCondition(idx);
                connection.query(sql, values, function(err, res) {
                    if (!err && cb!=null) getOne(idx,cb);
                });
            });
        },
        
        count: function(where,cb) {
            var sql="SELECT count(*) AS c FROM "+opt.table;
            if (where) {
                where2whereObj(where,function(obj){
                    sql+=' WHERE '+obj.where;
                    connection.query(sql,obj.values,function(err, rows) {
                        if (!err && rows.length>0) cb(rows[0].c);
                        else cb(0);
                    });
                });
            } else {
                 connection.query(sql,function(err, rows) {
                    if (!err) cb(rows[0].c);
                });
            }
            
        },
        
        add: function(d,cb) {

            d['_created']=Date.now();
            d['_updated']=Date.now();
            
            json(d);
            
            checkFields(d,function(){
                connection.query('INSERT INTO '+opt.table+' SET ?',d,function(err,res){
                    if (!err && cb) getOne(res.insertId,cb);
                });
            });
            
        },
        
        remove: function (idx,cb) {
            var sql="DELETE FROM "+opt.table+" WHERE "+indexCondition(idx);
    
            connection.query(sql,function(err,res) {
                if (!err) cb();
            });
        },
        
        index: function(data) {
        },
        
        max: function(element,where,cb) {
            var sql="SELECT max("+element+") AS m FROM "+opt.table;
            if (where) {
                where2whereObj(where,function(obj){
                    sql+=' WHERE '+obj.where;
                    connection.query(sql,obj.values,function(err, rows) {
                        if (!err) cb(rows[0].m);
                        else cb(0);
                    });
                });
            } else {
                 connection.query(sql,function(err, rows) {
                    if (!err) cb(rows[0].m);
                    else cb(0);
                });
            }            
        },
        
        ultimateSave: function () {
        },
        
        inited: function () {
            return inited;
        }
 
    }
}


module.exports = Model;