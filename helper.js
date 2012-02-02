var cfg = require('./cfg.js');

function pad(n) {
  return n < 10 ? '0' + n : n;
}

exports.to_char = function(date,fmt){
  date = date || new Date();
  date = new Date(date.getTime()+3600000*cfg.tzOffset);
  return fmt
    .replace(/yyyy/g, function(){
      return pad(date.getFullYear().toString());
    })
    .replace(/yy/g, function(){
      return pad(date.getFullYear().toString().substr(2));
    })
    .replace(/mm/g, function(){
      return pad(date.getMonth()+1);
    })
    .replace(/dd/g, function(){
      return pad(date.getDate());
    })
    .replace(/hh/g, function(){
      return pad(date.getHours().toString());
    })
    .replace(/mi/g, function(){
      return pad(date.getMinutes().toString());
    })
    .replace(/ss/g, function(){
      return pad(date.getSeconds().toString());
    });
};

exports.naming = function(data,names) {
	//if(!(names instanceof Array)) throw new Error("to name values, you must use names parameter as Array");
	names = names.split(",");
	data = data.split(",");
	var obj = {}
	names.forEach(function(n,i){
		obj[n] = data[i];
	})
	return obj;
}