var url = require('url');
var fs = require('fs');

var root=__dirname+'/../../web';


var Web = function(com,ini,logger,callback) {
    
    com.on('initstate',function(opt,db) {
        var ios=db.ios.getAll().data;
        for (var io in ios) {
            opt.socket.emit('io', ios[io]);
        }
    });
    
    com.on('notify',function(sockets,type,data) {        
        for (var i=0;i<sockets.length; i++) {
            sockets[i].emit(type, data);
        }
    });
    
    return {
        //Web router
        'request': function(request,response) {

            var path = url.parse(request.url).pathname;
                
            switch(path){
                case '/check-homiq-web':
                    response.writeHead(200, {"Content-Type": "text/html","Access-Control-Allow-Origin": "*"});
                    response.write('OK', "utf8");
                    response.end();            
                case '/':
                   
                    fs.readFile(root + '/index.html', function(error, data){
                        if (error){
                            response.writeHead(404);
                            response.write("opps this doesn't exist - 404");
                            response.end();
                        }
                        else{
                            response.writeHead(200, {"Content-Type": "text/html"});
                            if (!response.finished) {
                                response.write(data, "utf8");
                                response.end();    
                            }
                            
                        }
                    });
                    break;
                default:
                    response.writeHead(404);
                    response.write("opps this doesn't exist - 404");
                    response.end();
                    break;
            }        
    
        
        },
        
        'data': function(data) {
            logger.log('Click '+data,'web');
            callback('input',{haddr: data});
        },
        

    }
    
}



module.exports = Web;