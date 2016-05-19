var spreadsheetId=null;
var credentials=null;
var userauth=null;
var projectdata;

loadJS(['https://apis.google.com/js/api.js','https://apis.google.com/js/client.js']);

var filePicked = function (data) {
    if (data!=null && data.action=='picked') {
        spreadsheetId=data.docs[0].id;
    }

    if (spreadsheetId==null) return;
    
    
    gapi.client.load('https://sheets.googleapis.com/$discovery/rest?version=v4').then(function() {
    
        //https://developers.google.com/sheets/samples/sheet#add_a_sheet
        gapi.client.sheets.spreadsheets.batchUpdate({
            spreadsheetId: spreadsheetId,
            requests: [{
                addSheet:{
                    properties: {
                        title: projectdata.name
                    }
                }
            
            }]
        }).then(function(resp) {
            console.log(resp);
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
                    .setCallback(filePicked)
                    .build();
                 picker.setVisible(true);
            }
        });
    }
}

var userAuthorized = function (auth) {
    userauth=auth;
    pickFile();
}

var exportToSpreadsheet = function (project) {
    projectdata=project;
    
    if (userauth==null) {
        websocket.emit('credentials');
        websocket.once('credentials',function(data){
            credentials=data;
 
            
            gapi.load('auth', {
                'callback': function() {
              
                    window.gapi.auth.authorize({
                        'client_id': credentials.clientId,
                        'scope': credentials.scope,
                        'immediate': false
                    },userAuthorized);
            }});
            
        });        
    } else {
        pickFile();
    }

    //console.log(project);
}