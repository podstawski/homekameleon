var spreadsheetId=null;
var credentials=null;
var userauth=null;
var projectdata;

loadJS(['https://apis.google.com/js/api.js?onload=apiLoaded','https://apis.google.com/js/client.js']);

websocket.emit('credentials');
websocket.once('credentials',function(data){
    credentials=data;
});

var apiLoaded=function() {
    gapi.load('auth');
}



var filePicked = function (data) {
    if (data!=null && data.action=='picked') {
        spreadsheetId=data.docs[0].id;
    }

    if (spreadsheetId==null) return;
    
    toastr.info($.translate('Please wait'), $.translate('Exporting data to the sheet'), {
        "closeButton": true,
        "debug": false,
        "newestOnTop": false,
        "progressBar": true,
        "positionClass": "toast-top-right",
        "preventDuplicates": false,
        "showDuration": "50000",
        "hideDuration": "200",
        "timeOut": "50000",
        "extendedTimeOut": "200",
        "showEasing": "swing",
        "hideEasing": "linear",
        "showMethod": "fadeIn",
        "hideMethod": "fadeOut"
    });
    
    
    websocket.emit('project',projectdata.id);
    websocket.once('project',function(structure){

        var data=[
            ['Object name','','Room name','Device type','Device name','Label','Inputs','Outputs']
        ],row;
        
        for (var i=0;i<data[0].length;i++) data[0][i]=$.translate(data[0][i]);
        
        for (var i=0;i<structure.data.length;i++) {
            if (!structure.data[i]._sub) structure.data[i]._sub=[{name:'',_elements:structure.data[i]._elements}];
            row=[structure.data[i].name,'','','','','','',''];
            
            for(var j=0; j<structure.data[i]._sub.length; j++) {
                if (j==0) row[1]=structure.data[i]._sub[j].name;
                else row=['',structure.data[i]._sub[j].name,'','','','','',''];
                
                for (var k=0; k<structure.data[i]._sub[j]._elements.length; k++) {
                    if (k==0) row[2]=structure.data[i]._sub[j]._elements[k].name;
                    else row=['','',structure.data[i]._sub[j]._elements[k].name,'','','','',''];
                    
                    for (var l=0; l<structure.data[i]._sub[j]._elements[k].elements.length; l++) {
                    
                        if (l>0) {
                            row=['','','','','','','',''];
                        }
                        row[3]=structure.data[i]._sub[j]._elements[k].elements[l].type;
                        row[4]=structure.data[i]._sub[j]._elements[k].elements[l].name;
                        row[5]=structure.data[i]._sub[j]._elements[k].elements[l].label;

                        row[6]=structure.data[i]._sub[j]._elements[k].elements[l].inputs||0;
                        row[7]=structure.data[i]._sub[j]._elements[k].elements[l].outputs||0;
                                     
                        data.push(row);
           
                    }
                    
                }
            }
        }
        
        gapi.client.load('https://sheets.googleapis.com/$discovery/rest?version=v4').then(function() {
        
            //https://developers.google.com/sheets/samples/sheet#add_a_sheet
            var d=new Date();
            var sheetName=projectdata.name+' - '+d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate()+' / '+d.getHours()+'-'+d.getMinutes();
            
            sheetName=projectdata.name;
            sheetName=sheetName.replace('\!','');
            
            var pasteData = function(data,name) {
                
                gapi.client.sheets.spreadsheets.values.update({
                    spreadsheetId: spreadsheetId,
                    range: sheetName+'!'+'A1:H'+data.length,
                    valueInputOption: 'USER_ENTERED',
                    majorDimension: 'ROWS',
                    values: data
                }).then(function(resp){
                    
                    toastr.clear();
                    toastr.success(resp.result.updatedRange, name, {
                        closeButton: true,
                        progressBar: true,
                    });
                    
                });             
            }
            
            
            gapi.client.sheets.spreadsheets.get({
                spreadsheetId: spreadsheetId
            }).then(function(resp){
                
            
                
                var found=false;
                for (var i=0; i<resp.result.sheets.length; i++) {
                    
                    if (resp.result.sheets[i].properties.title==sheetName) {
                        found=true;
                        break;
                    }
                }
                if (!found) {
                    gapi.client.sheets.spreadsheets.batchUpdate({
                        spreadsheetId: spreadsheetId,
                        requests: [{
                            addSheet:{
                                properties: {
                                    title: sheetName
                                }
                            }
                        
                        }]
                    }).then(function(respSheet) {
                        pasteData(data,resp.result.properties.title);
                    });
                } else {
                    pasteData(data,resp.result.properties.title);
                }
            });   
            
    
        });

    
    });
    

}


var pickFile = function() {
    if (spreadsheetId==null) {
        gapi.load('picker', {
            'callback': function() {
                var view = new google.picker.View(google.picker.ViewId.SPREADSHEETS);
                var picker = new google.picker.PickerBuilder()
                    .enableFeature(google.picker.Feature.NAV_HIDDEN)
                    .enableFeature(google.picker.Feature.MULTISELECT_ENABLED)
                    .setAppId(userauth.clientId)
                    .setOAuthToken(userauth.access_token)
                    .addView(view)
                    .addView(new google.picker.DocsUploadView())
                    .setLocale($.translateLang())
                    .setDeveloperKey(credentials.apikey)
                    .setCallback(filePicked)
                    .build();
                 picker.setVisible(true);
            }
        });
    } else {
        filePicked();
    }
}
 

var exportToSpreadsheet = function (project) {
    projectdata=project;
    
    if (userauth==null) {
        window.gapi.auth.authorize({
            'client_id': credentials.clientId,
            'scope': credentials.scope,
            'immediate': false
        },function (auth) {
            userauth=auth;
            pickFile();
        });
  
    } else {
        pickFile();
    }

    //console.log(project);
}