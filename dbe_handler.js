var cfg = require('./cfg.js')
 ,	hlp = require('./helper.js')
 ,	http = require('http')
 ,	dc = require("./data.js")
 ,	pwc = require("./pwc.js")
 ,	db  = new pwc(cfg.dbHost,cfg.dbPort)
 ,	gids = dc.gids
 ;

exports.TeamMpidsChg = function(data) {
	var key = hlp.naming(data,"gid,tid");
	var group = gids[key.gid];
	if(!group) return;
	var team = group.tids[key.tid];
	if(!team) return;
	db.get(key.gid,'im_h.tid_members',{tid:key.tid},function(mpids) {
		team.mpids = mpids.split(',');
		console.log("team(%s.%s)'s mpids = '%s'", key.gid, key.tid, mpids);
		team.broadcast("TeamMpidsChg",{tid:key.tid});
	});
}
