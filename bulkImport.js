// 
//  bulkImport.js
//  dev
//  
//  Created by kaven276 on 2011-11-10.
//  Copyright 2011 pspdweb. All rights reserved.
// 

// =================================================================================
// = that 's for bulk module load, and automatically assign a name to reference it =
// =================================================================================

global.requires = global.import = global.bulkRequire = module.exports = function(str){
	var base = module.parent.filename.replace(/(\/|\\)[^\/\\]+$/,'');
	var path = require('path');
	var parts = str.replace(/\s/g,'').split(',');
	var outs = {};
	parts.forEach(function(p) {
		var exportName = '', memberName = '', tmp, out, oriP = p;
		
		tmp = p.split("=");
		if(tmp.length===2) {
			exportName = tmp[1];
			p = tmp[0];
		}
		
		tmp = p.split("#");
		if(tmp.length===2) {
			memberName = tmp[1];
			exportName = exportName || memberName;
			p = tmp[0];
		} else {
			exportName = exportName || p.split('/').pop().replace(/\.js$/,'');
		}
		
		if(p.match(/\.js$/)) out = require(path.join(base,p)); else out = require(p);
		if(memberName) out = out[memberName];		
		if(exportName in outs) throw new Error(exportName +' repeated !');
		outs[exportName] = out;
		// if(out instanceof Object) out.bulkImportSrc = oriP;
	});
	return outs;
}

if(require.main===module)
	console.log(module.exports(' util , 	url#parse	 , querystring#parse=qsParse 	'));