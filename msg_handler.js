
var ex = requires('./cfg.js, ./pwc.js, marked=md, ./helper.js=hlp, ./data.js=dc');
var dc = ex.dc
 ,	db = new ex.pwc(ex.cfg.dbHost,ex.cfg.dbPort)
 ,	gids = dc.gids;

function Handler(ws) {
	this.ws = ws;
	console.log("new listener handler created")
}
module.exports = Handler;

Handler.prototype.bind = function(data) {
	var ws = this.ws
	 ,	group = dc.getAddGCust(data.gid)	
	 ,	ons = {}
	 ,	nexts = [get_my_pid,get_tids_mpids,give_online_pids,signal_online]
	 ;
	nexts.shift()(nexts);
	
	function get_my_pid(nexts) {
		db.get(data.gid,'im_h.msid2pid',{msid:data.msid},function(pid) {
			console.log('got pid(%s) from msid(%s)',pid,data.msid);
			var emp = group.getAddEmp(pid).bindSock(ws);
			ws.emp = emp;
			ws.sendJSON("pid",{pid:pid});
			nexts.shift()(nexts);
		});
	}
	function get_tids_mpids(nexts) {			
		var missingTids = [];
		data.tids.forEach(function(tid){if(!group.tids[tid]) missingTids.push(tid);});
		if(missingTids.length===0) { nexts.shift()(nexts); return; }
		db.get(data.gid,'im_h.tids_members',{tids:missingTids.join(',')},function(text) {
			var teams = text.split('\n');
			teams.pop();					
			teams.forEach(function(team) {
				var team = team.split(':');
				if(team.length===2) group.addTeam(team[0],team[1].split(','));
			});
			nexts.shift()(nexts);
		});		
	}
	function give_online_pids(nexts) {				
		data.tids.forEach(function(tid) {
			ons[tid]=group.tids[tid].mpids.filter(
				function(mpid){return !!group.pids[mpid]}
			);					
		});
		ws.sendJSON("bind_ack",ons);
		nexts.shift()(nexts);
	}
	function signal_online() {					
		var onPid = ws.emp.pid;
		var pids = group.pids;
		for(tid in ons) {
			ons[tid].forEach(function(mpid){
				pids[mpid].socks.forEach(function(sock) {
					sock.emit("on",{pid:onPid});
				});
			});
		}
	}
};

// unbind should be kept for fake offline, that others received offline msg, but msg do send to it.
// this used to express I'm not watching new messages, but do send msg to my IM client
// We recommend all user open the IM client all the time he has a net connect, 
// so when he is off net, all messages is allready in this client

Handler.prototype.unbind = function() {
	this.ws.close();
	// this.close(); // this will called as close event handler, so do not call it repeatly
}
Handler.prototype.close = function() {
	var ws = this.ws
	 ,	offPid = ws.emp.pid
	 ,	group = ws.emp.group
	 ,	tids = group.tids
	 ,	pids = group.pids
	 ;
	if(!pids[offPid].unbindSock(ws)) return;
	for(var tid in tids) {
		var team = tids[tid];
		if(~team.mpids.indexOf(offPid)) team.broadcast("off",{pid:offPid})
	}
}

Handler.prototype.msg = function(data) {
	var emp = this.ws.emp
	 ,	group = emp.group
	 ,	team = group.tids[data.tid]
	 ;
	team.checkNewDay();	
	var m = team.appendMsg(emp.pid, data.msg, data.marked);
	team.broadcast('msg',m);
	team.lazyLogMsgs();
};


/* data structure note.
 gids[gid].pids[pid] exists stand for online, otherwise stand for offline
 im server need to save mpids for all team that is involed
 so every login should use all participating team's mpid
 to singal status and broadcast msg
*/