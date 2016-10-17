

var navReady = function () {
    $('.navcharts').addClass('active');
};

var chartsObj = new chartsClass();
var charts = {};
websocket.emit('collections');
