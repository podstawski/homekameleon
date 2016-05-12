(function ( $ ) {
    var dictionary={};
    
    var userLang = navigator.language || navigator.userLanguage;
    //alert ("The language is: " + userLang);
    
    $.getJSON('assets/js/langs.json',function (d) {
        dictionary=d;
        $.translateLang(userLang);
    });
    
    $('.translation .translate-option').click(function(){
        var lang=$(this).attr('lang');
        $.translateLang(lang);
    });
    
    $.extend({
        'translate': function (txt,lang) {
            if (lang==null) lang=userLang;
        
            txt=txt.trim();
            if (typeof(dictionary[lang])=='undefined') return txt;
            
            if (typeof(dictionary['en'][txt])=='undefined' && typeof(websocket)!='undefined') {
                websocket.emit('db-save','langs',{label:txt});
            };
            
            if (typeof(dictionary[lang][txt])=='undefined') return txt;
            return dictionary[lang][txt];
        },
        'translateLang': function(lang) {
            if (lang==null) return userLang;
            
            userLang=lang;
            $('.translate').translate();
            var src=$('.translation .translate-option[lang="'+lang+'"] img').attr('src');
            if (src!=null && src.length>0) $('.translation .translate-main img').attr('src',src);
            
        }
    });
    
    $.fn.translate = function () {
        this.each (function() {
        
            var txt=$(this).attr('original-text')||$(this).attr('placeholder')||$(this).attr('title')||$(this).text();
            var trans=$.translate(txt);
    
            if ($(this).is('input')) {
                $(this).attr('placeholder',trans);
            } else if ($(this).attr('title')!==undefined) {
                $(this).attr('title',trans);
            } else {
                $(this).text(trans);
            }
            if (txt!=trans) $(this).attr('original-text',txt);
            
        });
        return this;
    };
})(jQuery);