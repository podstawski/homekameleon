module.exports.unit = function (io) {
	   var res='';
           if (io.unit && io.unit.length>0 && io.change) {
               var unit=io.unit;
               if (io.change==1) unit=unit.replace('⇆','↘');
               if (io.change==-1) unit=unit.replace('⇆','↗');
               unit=unit.replace('⇆','').trim();
               res+=' '+unit;
           }
	   return res;
}
