var url = require('url');
var fs = require('fs');
var admin = require('../../admin/admin.js');

var root_path=__dirname+'/../../admin/public';

var Web = function(com,ini,logger,callback) {
    var database;
    
    com.staticContent(root_path);
    
    com.on('initstate',function(opt,db) {
        database=db;
        admin(opt.socket,opt.session,opt.hash,database,root_path,ini,logger); 
    });
    
    com.on('notify',function(sockets,type,data) {        
        
        for (var i=0; i<sockets.length; i++) {
            sockets[i].socket.emit('bus',data.haddr,data.value);
        }
        
    });
    
    return {
        //Web router
        'request': function(request,response) {

            var path = url.parse(request.url).pathname;
                
            switch(path){
                case '/check-web':
                    response.writeHead(200, {"Content-Type": "text/html","Access-Control-Allow-Origin": "*"});
                    response.write('OK', "utf8");
                    response.end();            
                
                default:
                    response.writeHead(404);
                    response.write("opps this doesn't exist - 404");
                    response.end();
                    break;
            }        
    
        
        },
        
        'data': function(data) {
            

    
            if (data===undefined) {
                //code
            } else if (typeof(data)=='object') {

                if (typeof(data.haddr)=='string') {
                    logger.log('Click '+data.haddr+': '+data.value,'web');
                    
                    if (data.haddr=='script') {
                        callback('script',{script:data.value});
                    } else database.ios.get(data.haddr,function(io){
                        if (io.io=='i') callback('input',{haddr: data.haddr, value: data.value});
                        if (io.io=='o' || io.io=='r') callback('set',{haddr: data.haddr, value: data.value});
                    });           

                }
                
                if (typeof(data.haddr)=='object') {
                    for (var i=0;i <data.haddr.length; i++) {
                        
                        var io=database.ios.get(data.haddr[i]);
                        if (io==null) logger.log('IO not found: '+data.haddr[i],'error')
                        else data.socket.emit('bus',io.haddr,io.value);
                    
                    }
                }

            }

                        
            
        },
        

    }
    
}



module.exports = Web;