function verticalAlignMiddle()
{
    var bodyHeight = $(window).height()-260;
    var formHeight = $('.vamiddle').height();
    var marginTop = (bodyHeight / 2) - (formHeight / 2);
    if (marginTop > 0)
    {
        $('.vamiddle').css('margin-top', marginTop);
    }
}
$(document).ready(function()
{
    verticalAlignMiddle();
});
$(window).bind('resize', verticalAlignMiddle);

$('#login').click(function() {
    var data={};
    
    $('.login-form input').each(function(){
        data[$(this).attr('name')]=$(this).val();
    });
    
    
    websocket.emit('login',data);
});