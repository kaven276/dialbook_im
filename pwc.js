/**
 * for call psp.web stored procedure
 * it's a class
 */
 
var http = require('http')
 ,	qs = require('querystring');
 
/**
 * @param {string} host
 */

var c = module.exports = function(host,port){
  this.host = host;
  this.port = port;
};
var p = c.prototype;

// send oracle request, at end call cbfn with http body
// use1. pipe the output to user-agent
// use2. bind to the global data cache
// use3. 
p.get = function(dad,prog,qstr,cbfn) {
	if(typeof qstr === 'object') qstr = qs.stringify(qstr);
	var options = {
		host : this.host,
		port : this.port,
		method : 'get',
		path : '/' + dad + '/' + prog + (qstr?('?'+qstr):'')
	};
	console.log('pwc to %s', options.path);
	var req = http.request(options,function(res){
		var data = [];
		res.on('data', function(chunk){data.push(chunk);});
		res.on('end', function(){
			cbfn(data.join(''));
			return;
			if(typeof cbfn === 'function') cbfn(data.join(''));
			if(typeof cbfn === 'object') {
				cache[cbfn].data = data.join('');
				cache[cbfn].src = 'complete url'; // for updating
				cache.src['url'] = 'global cache';
			}
		});
	});
	req.end();
}