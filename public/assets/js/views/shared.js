$(function(){

    function random(min,max) {
        return Math.floor(Math.random()*(max-min+1)+min);
    }

    var elements = 16;
    var labels = [];
    var data = [];
    var data1 = [];
    var data2 = [];

    for (var i = 0; i <= elements; i++) {
        labels.push('1');
        data.push(random(40,100));
        data1.push(random(20,100));
        data2.push(random(60,100));
    }

    var options = {
        pointHitDetectionRadius : 0,
        showScale: false,
        scaleLineWidth: 0.001,
        scaleShowLabels : false,
        scaleShowGridLines : false,
        pointDot : false,
        showTooltips: false,
        responsive: true,
    }



});
