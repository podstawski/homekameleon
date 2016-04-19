var url = require('url');
var fs = require('fs');
var admin = require('../../admin/admin.js');


var Web = function(com,logger,callback) {
    var database;
    
    com.staticContent(__dirname+'/../../admin/public');
    
    com.on('initstate',function(opt,db) {
        database=db;
        admin(opt.socket,opt.session,opt.hash,database); 
    });
    
    com.on('notify',function(sockets,type,data) {        

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
            logger.log('Click '+data,'web');
            callback('input',{address: data});
        },
        

    }
    
}



module.exports = Web;