websocket.on('lang',function(lng,login){
    
    if (login) {
        $('.loggedin').show();
        $('.loggedout').hide();
        $('.username').text('Admin');
        websocket.emit('series');
    } else {
        $('.loggedin').hide();
        $('.loggedout').show();
        $('.username').text('Guest');     
    }
});


websocket.once('series',function(data) {
    if (data==null) return;
    
    data.series.push({ //new record
        name: '',
        bus: '',
        address: ',,',
        driver: '',
        icon: '',
        color: 'rgba(20,20,20,0.2)',
        active: true
    });
    
    console.log(data);
    
    var opt = function (k) {
        return '<option value="'+k+'">'+k+'</option>';
    }
    var rel = function (elm,fun,relIdx,relSuggested) {
        if (elm.attr('rel') || relSuggested) {
            var rel=elm.attr('rel');
            if (relIdx!=null) {
                rel=rel.split(',')[relIdx];
            }
            if (rel.length==0 && relSuggested) {
                rel=relSuggested;
            }
            elm.val(rel);
            if (typeof(fun)=='function') fun(elm);
        }
        
        if (typeof(fun)=='function') {
            elm.change(function(){
                fun(elm);
            });
        }
    }
    
    $.smekta_file('views/series.html',data,'.main .panel .panel-body',function(form){
    
        $('form .serie input.color').colorPicker('input.color',{
            readOnly: true,
            init: function(elm, colors) {
                
                elm.style.backgroundColor = elm.value;
                //elm.style.color = colors.rgbaMixBG.luminance > 0.22 ? '#222' : '#ddd';
            }
        });    

        $('form .series select').append('<option value="">Choose</option>');
        
        for (var k in data.busses) {
            $('form .series select.bus-type').append(opt(k));
        }
        
        for (var i=0; i<data.icons.length; i++) {
            $('form .series select.icon').append(opt(data.icons[i]));
        }
        
        var busAddrChanged = function(s) {
            var bus=s.closest('.series').find('select.bus-type').val();
            var no=s.closest('.series').find('select.bus-no').val();
            var drv=s.closest('.series').find('select.driver').attr('rel');
            var addr=s.val();
            
            if (addr==null || addr.length==0) {
                return;
            }
            
            if (drv==null || drv.length>0) {
                return;
            }
            
            for (var i=0;i<data.busses[bus].bus[no].length; i++) {
                
                if (data.busses[bus].bus[no][i].address==parseInt(addr) && data.busses[bus].bus[no][i].driver!=null) {
                    rel(s.closest('.series').find('select.driver'),driverChanged,null,data.busses[bus].bus[no][i].driver);    
                }
            }
            

        }
        
        var busNoChanged = function(s) {
            s.closest('.series').find('select.bus-addr').find('option').slice(1).remove();
            var bus=s.closest('.series').find('select.bus-type').val();
            var no=s.val();
            
            if (no==null || no.length==0) {
                return;
            }
            
            
            
            for (var i=0; i<data.busses[bus].bus[no].length; i++) {
                var addr=data.busses[bus].bus[no][i].address;
                var ss=s.closest('.series').find('select.bus-addr').append(opt(addr));
                rel(ss,busAddrChanged,1);
            }
            
        };
        
        var driverChanged = function(s) {
            s.closest('.series').find('select.endpoint').find('option').slice(1).remove();
            var bus=s.closest('.series').find('select.bus-type').val();
            
            var drv=s.val();

            if (drv==null || drv.length==0) {
                return;
            }
            
            for (var i=0; i<data.busses[bus].drivers[drv].length; i++) {
                var ep=data.busses[bus].drivers[drv][i];
                var ss=s.closest('.series').find('select.endpoint').append(opt(ep));
                rel(ss,null,2);
            }
            
        };
        
        var busTypeChanged = function(s) {
            s.closest('.series').find('select.bus-no').find('option').slice(1).remove();
            s.closest('.series').find('select.driver').find('option').slice(1).remove();
            
            var bus=s.val();
            if (bus==null || bus.length==0) {
                return;
            }
            
            for (var k in data.busses[bus].bus) {
                var ss=s.closest('.series').find('select.bus-no').append(opt(k));
                rel(ss,busNoChanged,0);
            }

            for (var k in data.busses[bus].drivers) {
                var ss=s.closest('.series').find('select.driver').append(opt(k));
                rel(ss,driverChanged);
            }

            
        }
        $('form .series select.bus-type').each(function(){
            rel($(this),busTypeChanged);
        });
        
        $('form .series select.icon').each(function(){
            rel($(this));
        });
        
        
        $('form button.btn-primary').click(function(){
            var data=[];
            $('form .series').each(function(){
                var r={active: false};
                var pass=true;
                $(this).find('input,select').each(function(){
                    var name=$(this).attr('name');
                    if (name=='active') {
                        r[name]=$(this).prop('checked');
                    } else {
                        r[name] = $(this).val();
                        if (r[name].length==0 && name!='multiplier') pass=false;
                    }
                });
                
                if (pass) {
                    r.address=[parseInt(r.busno), parseInt(r.busaddr), r.endpoint];
                    delete (r.busno);
                    delete (r.busaddr);
                    delete (r.endpoint);
                    
                    data.push(r);
                }
            });
        
            websocket.emit('series',data);
            websocket.once('series',function(errors) {
                if (!errors) {
                    $('form input,form select').parent().addClass('has-success');
                    setTimeout(function(){
                        $('body').fadeOut(2000,function(){
                            location.href='index.html';
                        });
                        
                    },1000);
                } else {
                    for (var i=0; i<errors.length; i++) {
                        $('form input[name="'+errors[i]+'"]').parent().addClass('has-error');
                    }
                }
            });
            return false;
        });
    });
});