var fs = require('fs');
var path=require('path');
var crypto = require('crypto');

var images='images';


var Admin = function(socket,session,hash,database,public_path,ini,logger) {
    var loggedIn=false;

    var hashPass=function(txt) {
        var md5sum = crypto.createHash('md5');
        md5sum.update(txt);
        return md5sum.digest('hex');
    };
    
    var uuid=function(len) {
        if (len==null) len=4;
        var base=new Buffer(''+Math.random());
        
        var hash=base.toString('base64').replace('=','');
        var ret=hash.substr(-1*len).toUpperCase();
        return ret;
    };
    
    var rid=function(len) {
        if (len==null) len=8;
        var ret=hashPass(''+Date.now()).substr(0,len);
        return ret;
    }
 
    var fileUploadData = function(data) {

        if ( data.length>0 && data.substr(0,5)=='data:') {
            data=data.substr(5);
            var slash=data.indexOf('/');
            data=data.substr(slash+1);
            var semicolon=data.indexOf(';');
            var data_ext=data.substr(0,semicolon);
            data_ext=data_ext.replace('svg+xml','svg');
            data=data.substr(semicolon+1);
            
            if (data.substr(0,7)=='base64,') {
                var data_blob=new Buffer(data.substr(7),'base64');
                return {ext: data_ext,blob:data_blob}
            }
        }
        return null;
    }
    
    var fileSaveData = function(obj) {
        var name=images+'/'+obj.name+'.'+obj.ext;
        
        var path_name=path.dirname(public_path+'/'+name);
        try {
            fs.lstatSync(path_name);    
        } catch(e) {
            fs.mkdirSync(path_name,0755);
        }
        
        fs.writeFile(public_path+'/'+name,obj.blob);
        return name;
    }
    
    var fileDirList = function(dir) {
        var d=public_path+'/'+images;
        if (dir!=null && dir.length>0) {
            d+='/'+dir;
        }
        
        try {
            return fs.readdirSync(d);
        } catch (e) {
            return [];
        }
        
    };
    
    var fileUnlink = function(f,cb) {
        var p=public_path +'/'+images+'/'+f;
        try {
            fs.unlink(p,cb);  
        } catch(e) {
            cb();
        }
      
    };
    
    var fileExists=function(f) {
        var p=public_path +'/'+images+'/'+f;

        try {
            fs.lstatSync(p);   
        } catch(e) {
            return false;
        }
                
        return true;
    };
    
    var getFloorElements = function(elements) {
        
        var ret=[],rooms={0:{id:0, name:'_unassigned'}};
        
        for(var i=0; i<elements.length; i++) {
            if (elements[i].type=='polygon') {
                rooms[elements[i].id] = elements[i];
            }
        }
        
        for(var i=0; i<elements.length; i++) {
            if (elements[i].type=='polygon') continue;
            if (typeof(elements[i].room)=='undefined' || elements[i].room==null) elements[i].room=0;
        
            var dst=null;
            for (var j=0; j<ret.length; j++) {
                if (ret[j].id==elements[i].room) {
                    dst=ret[j];
                    break;
                }
            }
            if (dst==null) {
                ret.push(rooms[elements[i].room]);
                dst=ret[ret.length-1];
            }

            if (typeof(dst.elements)=='undefined') dst.elements=[];
            
            dst.elements.push(elements[i]);
        }
        
        return ret;
    }
    
    var getProjectStructure = function(project,name,withelements,cb) {
        
        database.structure.select([{project:project,parent:null}],['pri','name'],function(structure){

            var subs=structure.data.length;
            for (var i=0; i<structure.data.length; i++) {
              
                structure.data[i].parent=null;
                structure.data[i].description=name;
                structure.data[i]._new=false;
                if (typeof(structure.data[i]._created)!='undefined' && structure.data[i]._created+30*60*1000> Date.now()) {
                    structure.data[i]._new=true;
                }
              
                structure.data[i]._sub=false;
                
                if (withelements) {
                    subs++;
                    database.floor.select([{floor:structure.data[i].id}],null,function(el){
                        structure.data[el.ctx]._elements=getFloorElements(el.data);
                        subs--;
                    },i);
                }
                
                database.structure.select([{project:project,parent:structure.data[i].id}],['pri','name'],function(sub) {

                    for (var j=0; j<sub.data.length; j++) {
                        sub.data[j]._new=false;
                        sub.data[j].description=structure.data[sub.ctx].name;
                    
                        if (typeof(sub.data[j]._created)!='undefined' && sub.data[j]._created+30*60*1000>Date.now()) {
                            sub.data[j]._new=true;
                        }
                        
                        if (withelements) {
                            subs++;
                            database.floor.select([{floor:sub.data[j].id}],null,function(el){
                                sub.data[el.ctx]._elements=getFloorElements(el.data);
                                subs--;
                            },j);
                        }       
                        
                    }
                    
                    if (sub.data.length>0) {
                          structure.data[sub.ctx]._sub=sub.data;
                    }
                    
                
                    subs--;
                    
                },i);
              
            }

            setTimeout(function(){
                if (subs>0) {
                    setTimeout(this._onTimeout,100);
                    return;
                }
                
                cb(structure);
            },0);



        });
        
    };
 
 
    var wallStructure = function (project,all) {
        if (!loggedIn) return;
        if (all==null) all=false;
                
        database.projects.get(project,function(rec){
            if (rec==null) return;
            
            getProjectStructure(project,rec.name,false,function(structure){
                if (!all) socket.emit('structure-all',structure);
                else {
                    for (var h in session) {    
                        if (typeof(session[h].socket)!='undefined' && session[h].socket!=null && typeof(session[h].project)!='undefined' && session[h].project==project) {
                            session[h].socket.emit('structure-all',structure);
                        }
                    }      
                }
            });
                
        });
        

    }
    
    
    var wallProjects = function (all) {
        if (all==null) all=false;
        
        
        if (loggedIn) {
            
            database.projects.select(null,['name'],function(projects){
          
                if (all) {
                    for (var h in session) {    
                        if (typeof(session[h].socket)!='undefined' && session[h].socket!=null) {
                            session[h].socket.emit('projects-all',projects);
                        }
                    }
                } else {
                    socket.emit('projects-all',projects);
                }


            });
  

        }
    }
    
    var wallDevices = function () {
        if (loggedIn) {
            database.devices.getAll(function(devices){
                
                for (var h in session) {    
                    if (typeof(session[h].socket)!='undefined' && session[h].socket!=null) {
                      session[h].socket.emit('devices-all',devices);
                    }
                }
            });
            
        }
    }
    
    var updateUserSessionData = function(u) {
        for (var h in session) {    
            if (session[h].username==u.username) {
                if (u.admin!==undefined) {
                    session[h].admin=u.admin;
                }
                if (u.active!==undefined && u.active==0 ) {
                    if (typeof(session[h].socket)!='undefined' && session[h].socket!=null) {
                      session[h].socket.emit('logout');
                    }
                }
                
                break;
            }
        }    
    }
    
    var wallFloor = function (floor) {
      
        if (loggedIn) {
            database.floor.select([{floor:floor}],null,function(data){
            
                 for (var h in session) {    
                     if (typeof(session[h].socket)!='undefined' && session[h].socket!=null && typeof(session[h].floor)!='undefined' && session[h].floor==floor) {
                       session[h].socket.emit('floor-select',data);
                     }
                 }
            });
        }
    }

    var login = function (data) {
        loggedIn=true;
        session[hash].username=data.username;
        session[hash].admin=data.admin;
        socket.emit('login',data);
        wallProjects();
    }
    
    var controlsFillAddr = function(db,d,cb) {

        database[db].get(d.id,function(rec) {

            if (rec==null) {
                if (typeof(cb)=='function') cb(d);
                return;
            }

            var needsave=false;

            if (typeof(rec.controls)=='object' && rec.controls!=null) {
                
                for(var i=0;i<rec.controls.length;i++) {
                    if (typeof(rec.controls[i].addr)=='undefined' || rec.controls[i].addr=='') {
                        rec.controls[i].addr=(i+1)+'';
                        needsave=true;
                    }
                    
                    if (typeof(rec.haddr)!='undefined' && rec.haddr!='' && rec.haddr!=null) { 
                        if (typeof(rec.controls[i].haddr)=='undefined' || rec.controls[i].haddr=='') {
                            var haddr=rec.haddr+'-';
                            
                            switch (rec.controls[i].type) {
                                case 'slider':
                                    haddr+='sl';
                                    break;
                                case 'txt':
                                    haddr+='tx';
                                    break;
                                default:
                                    haddr+='btn';
                                    break;
                            }
                            haddr+='.'+rec.controls[i].addr;
                            rec.controls[i].haddr = haddr;
                            needsave=true;
                        }
                    }
                }
                
            }
            
            if (needsave) database[db].set(rec,cb);
            else if (typeof(cb)=='function') cb(rec);
        });

    }
    
    var afterSavedFunctions = {
        
        projects: function(d,idxName,cb) {
            session[hash].project=d[idxName];
            wallProjects();
            
            if (typeof(ini.uuid)!='undefined') {
                database.projects.get(d[idxName],function(rec) {
                    
                    if ( typeof(rec.uuid)=='undefined' || rec.uuid=='' || rec.uuid==null) {
                        rec.uuid=uuid(ini.uuid.length);
                        session[hash].uuid=rec.uuid;
                        database.projects.set(rec,cb);
                    }
                });
            } else if (typeof(cb)=='function') {
                cb(d);
            }
            
        },
        
        structure: function(rec,idxName,cb) {
            var finish=function(rec,cb) {
                wallStructure(session[hash].project,true);
                if (typeof(cb)=='function') cb(rec);
            };
            
            var assignhaddr=function(rec,cb) {
                rec.haddr='cb.'+session[hash].uuid+'-inv.'+rid()+'-lev.'+rec.seqno;
                database.structure.set(rec,cb);
            };
            
            if (typeof(rec.seqno)=='undefined' || rec.seqno=='' || rec.seqno==null) {
                
                var cond=[{project: session[hash].project}];
                
                database.structure.max('seqno',cond,function(m){
                    if (m==null) m=0;
                    rec.seqno=parseInt(m)+1;
                    
                    assignhaddr(rec,function(rec){
                        finish(rec,cb);
                    });
                    
                });
                
                
                
            } else if (typeof(rec.haddr)=='undefined' || rec.haddr=='' || rec.haddr==null) {
                
                assignhaddr(rec,function(rec){
                    finish(rec,cb);
                });
                    
            } else {
                finish(rec,cb);                   
            }
            

        },
        
        devices: function(d,idxName,cb) {
            controlsFillAddr('devices',d,function(rec){
                wallDevices();
                if (typeof(cb)=='function') cb(rec);
            });
            
        },
        
        floor: function(d,idxName,cb) {

            var finish=function(rec,cb) {
                if (typeof(rec.floor)!='undefined') wallFloor(rec.floor);
                if (typeof(cb)=='function') cb(rec);
                
            };
            
            var assignhaddr = function(rec,cb) {
                if (typeof(session[hash].uuid)!='undefined') {
                    if (rec.type=='polygon') {
                        rec.haddr=session[hash].floor_haddr+'-room.'+rec.seqno;
                    } else {
                        rec.haddr='cb.'+session[hash].uuid+'-inv.'+rid()+'-cmb.'+rec.seqno;
                    }
                }
                
                
                database.floor.set(rec,function(rec) {
                    controlsFillAddr('floor',rec,function(rec){
                        cb(rec);   
                    });
 
                });
            };
            
            controlsFillAddr('floor',d,function(rec){
                
                if (typeof(rec.seqno)=='undefined' || rec.seqno=='' || rec.seqno==null) {
                    
                    var cond=[{project: session[hash].project}];
                    if (rec.type=='polygon') cond[0].type='polygon';
                    
                    database.floor.max('seqno',cond,function(m){
                        if (m==null) m=0;
                        rec.seqno=parseInt(m)+1;
                        
                        assignhaddr(rec,function(rec){
                            finish(rec,cb);
                        });
                        
                    });
                    
                    
                    
                } else if (typeof(rec.haddr)=='undefined' || rec.haddr=='' || rec.haddr==null) {
                    
                    assignhaddr(rec,function(rec){
                        finish(rec,cb);
                    });
                        
                } else {
                    finish(rec,cb);                   
                }
                
            });
        },
        
        users: function(d,idxName,cb) {
            updateUserSessionData(d);
            if (typeof(cb)=='function') cb(d);
        },
        
        ios: function(d,idxName,cb) {
      
            if (d[idxName]=='_new') {
                database.ios.remove('_new',function(){
                    
                    if (session[hash].uuid!==undefined) {
                        d[idxName]=session[hash].uuid+'-ADD-'+rid();
                        database.ios.add(d,cb);
                    }
                
                });
            } else cb(d);
        }
    }
    
    var afterSaved = function(db,rec,idxName,cb) {
        if (typeof(afterSavedFunctions[db])=='function') {
            afterSavedFunctions[db](rec,idxName,cb);
        } else if (typeof(cb)=='function') {
            cb(rec);
        }
    }
    
    socket.on('login',function (data) {
        loggedIn=false;
        var err_txt1='Login error',err_txt2="Username or password doesn't match",err_txt3='Account blocked';
      
        logger.log('Login request: '+data.username);
      
        if (data.username.length>0 && data.password.length>0) {
            database.users.get(data.username,function(u){
                if (u==null) {
                    database.users.count(null,function(c){
                        if (c==0) {
                            var user={
                                username: data.username,
                                password: hashPass(data.password),
                                admin: 1,
                                active: 1
                            };
                            database.users.add(user);
                            login(user);
                        } else {
                            socket.emit('err',err_txt1,err_txt2);
                        }
                    });
                } else {
        
                    if (hashPass(data.password)==u.password) {
                        
                        if (u.active==1) login(u);
                        else socket.emit('err',err_txt1,err_txt3);
                    } else {
                        socket.emit('err',err_txt1,err_txt2);
                    }
                }
                
            });
            
              
        } else {
            
            socket.emit('err',err_txt1,err_txt2);
        }
      
    });
    
    socket.on('logout',function() {
        session[hash].username=null;
        loggedIn=false;
        socket.emit('logout');
    });
    
    
    socket.on('db-save',function(db,d,idxName) {
        if (!loggedIn) return;
        if (typeof(database[db])=='undefined') return;
        if (typeof(idxName)=='undefined') idxName='id';
        if (typeof(d[idxName])=='undefined') d[idxName]=0;
        
        
        
        var dependencies=0;
        
        if (db=='users' && d.password!==undefined && d.password.length>0) {
            d.password=hashPass(d.password);
        }
        
        if (db=='structure' && parseInt(d[idxName])==0) {
            d.project=parseInt(session[hash].project);
            dependencies++;
                  
            database[db].max('pri',[{project: d.project}],function(m){
                d.pri=m+1;
                dependencies--;
            });
        }
        
        if (db=='floor') {
            d.project=parseInt(session[hash].project);
        }
      
        var img_blob=null;
        
        if (typeof(d.img)!='undefined') {
            img_blob=fileUploadData(d.img);
            if (img_blob!=null) {
                d.img='';
            }
        }
        
        setTimeout(function(){
            
            if (dependencies>0) {
                setTimeout(this._onTimeout,100);
                return;
            }
            
          
            var fun;
            if (d[idxName]==0 || d[idxName]=='0') {
                delete(d[idxName]);
                fun='add';
            } else {
                fun='set';
            }

            
            database[db][fun](d,function(d){
                
                
                if (img_blob!=null) {
                    var i=0;
                    while (fileExists(db+'-'+d[idxName]+'-'+i+'.'+img_blob.ext)) i++; 
                    img_blob.name=db+'-'+d[idxName]+'-'+i;
                    d.img=fileSaveData(img_blob);
                    database[db].set(d);
                }

                
                afterSaved(db,d,idxName,function(rec) {
                    //if (db!='langs') console.log(rec);
                    socket.emit(db,rec);
                });


            });
            
        },0);
        
        
    });
    
    socket.on('db-remove',function(db,idx){
        if (!loggedIn) return;
        
        if (typeof(database[db])=='undefined') return;
        
        
        if (db=='users' && session[hash].username==idx) {
            socket.emit('err','Remove user error','You must not remove yourself');
            return;
        }
        
        
        database[db].get(idx,function(rec){
            if (rec==null) return;
            
            database[db].remove(idx,function(){

                if (db=='projects') wallProjects(true);
                if (db=='structure') wallStructure(session[hash].project);
                if (db=='devices') wallDevices();    
                if (db=='floor') wallFloor(rec.floor);
                if (db=='users') database.users.getAll(function(all){
                    socket.emit('users-all',all);
                });
                if (db=='ios') socket.emit('ios',rec);
            
            });
        });
        
    
    });
    
    socket.on('db-select',function(db,where,order) {
        if (!loggedIn) return;
        if (typeof(database[db])=='undefined') return;
        database[db].select(where,order,function(ret){
            socket.emit(db+'-select',ret);
        });            
        
    });
    
    socket.on('db-get',function(db,idx){
        if (!loggedIn) return;
        if (typeof(database[db])=='undefined') return;
        
        
        var afterGet=function(ret) {
        
            if (ret==null && idx!=null) ret={};
            
            if (typeof(ret)=='object' && ret!=null) {
            
                if (idx==null) {
                    socket.emit(db+'-all',ret);
                } else {
                    socket.emit(db,ret);
                }
                
                if (db=='projects') {
                    session[hash].project=idx;
                    if (typeof(ret.uuid)!='undefined') {
                        session[hash].uuid=ini.uuid+ret.uuid;
    
                    }
                    wallStructure(idx);
                }
                if (db=='structure' && idx!=null) {
                    session[hash].floor=idx;
                    session[hash].floor_haddr=ret.haddr;
                }
        
            }

            
        }
        
        if (idx==null) {
            database[db].getAll(afterGet);
        } else {
            database[db].get(idx,afterGet);
        }
        

    });
    
    
    socket.on('upload-file',function(dir,data) {
        var files=fileDirList(dir);
        var obj=fileUploadData(data);
        if (obj!=null) {
            var i=files.length;
            while (fileExists(dir+'/'+i+'.'+obj.ext)) i++;
        
            obj.name=dir+'/'+i;
            
            fileSaveData(obj);
            socket.emit('files',dir,fileDirList(dir));
        }
    });
    
    socket.on('remove-file',function(f){
        fileUnlink(f,function(){
            var dir=path.dirname(f);
            socket.emit('files',dir,fileDirList(dir));
        });
    });
    
    socket.on('files', function(dir) {
        socket.emit('files',dir,fileDirList(dir));
    });
    
    
    socket.on('project',function(project){
        getProjectStructure(project,'',true,function(structure){
            socket.emit('project',structure);
        });
    });
    
    socket.on('add-user',function(data) {
        if (data.username===undefined || data.password===undefined || data.username.length==0 || data.password.length==0) {
            socket.emit('err','Add user error','Username and password should not be empty');            
            return;
        }
        database.users.get(data.username,function(u){
            if (u!=null) {
                socket.emit('err','Add user error','Username exists');            
                return;
            }
            data.password=hashPass(data.password);
            data.active=1;
            database.users.add(data,function(d) {
                socket.emit('add-user',d);
            });
        });
    });
    

    //INIT STATE

    if (typeof(session[hash].username)!='undefined' && session[hash].username!=null) {
        loggedIn=true;
        socket.emit('login',{username:session[hash].username, admin:session[hash].admin});
        wallProjects();
        if (typeof(session[hash].project)!='undefined') {
            database.projects.get(session[hash].project,function(p){
                socket.emit('projects',p);
            });
            wallStructure(session[hash].project);
        }
    } else {
        socket.emit('logout');
    }
    
    
    return {
        debug: function(p,cb) {
            getProjectStructure(p,'nic nie wiem',true,cb);
        }
    }
}



module.exports = Admin;
