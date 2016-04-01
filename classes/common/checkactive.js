
module.exports = function(obj){
  var typeofactive=typeof(obj['active']);
  if (typeofactive=='string') if (obj.active=='0') return false;
  if (typeofactive=='boolean') if (obj.active==false) return false;
  if (typeofactive=='integer') if (obj.active==0) return false;

  return true;
};