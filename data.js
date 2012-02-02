/**
 *	javascript memory data model and logger ( save & restore )
*/

var ex = requires('fs, path, ./cfg.js, ./helper.js=hlp');
var gids = exports.gids = {};

ex.fs.mkdir(ex.path.join(__dirname,'./msglogs'),'0700');

exports.getAddGCust = function(gid) {
	return (gids[gid] = gids[gid] || new GCust(gid));
}
function GCust(gid) {
	ex.fs.mkdir(ex.path.join(__dirname,'./msglogs/' + gid),'0700');
	this.gid = gid;
	this.pids = {};
	this.tids = {};
}
GCust.prototype.addTeam = function addTeam(tid,mpids) {
	return (this.tids[tid] = new Team(this,tid,mpids));
}
GCust.prototype.getAddEmp = function getAddEmp(pid) {
	return (this.pids[pid] = this.pids[pid] || new Emp(this,pid));
}

function Team(group,tid,mpids) {
	ex.fs.mkdir(ex.path.join(__dirname,'./msglogs/' + group.gid + '/' + tid), '0700');
	this.group = group;
	this.tid = tid;
	this.mpids = mpids;	
	this.day = '200805/26';
	this.checkNewDay();
}
Team.prototype.appendMsg = function(pid,msg,marked) {
	var m = new Msg(this.logMem.length,pid,msg,marked);
	this.checkNewDay();
	this.logMem.push(m);	
	return {seq:m.seq, tid:this.tid, pid:pid, msg:marked?md(msg+'\n'):msg, marked:marked, date:ex.hlp.to_char(m.date,'yyyy-mm-dd hh:mi:ss')};
}
Team.prototype._logFileName = function(day) {
	var p = ex.path.join(__dirname,'./msglogs/' + this.group.gid + '/' + this.tid);
	ex.fs.mkdir(p + '/' + day.split('/')[0], '0700');
	return p + '/' + day + '.log';
}
Team.prototype.checkNewDay = function() {
	var curDay = ex.hlp.to_char(new Date(),'yyyymm/dd');
	if(this.day === curDay) return;
	if(this.logStream) {
		this.saveUnsavedMsgs();
		this.logStream.end();
		this.logStream.destroySoon();
		this.logStream = undefined;
	}
	// new yearmonth or new day arrived here
	var fpath = this._logFileName(curDay);
	try{ var fsize = ex.fs.statSync(fpath).size; } catch(e) {}
	this.logStream = ex.fs.createWriteStream(fpath,{flags:'a+',encoding:'utf8'});
	var team = this;
	// this.logStream.on('drain',function(e){console.log('team '+team.tid+' drained.');})
	if(!fsize) this.logStream.write(this.day + ' for ' + this.group.gid + '.' + this.tid)
	this.day = curDay; 
	this.logMem = [];
	this.unsavedPos = 0;
	this.unsavedTime = new Date();
}	
Team.prototype.lazyLogMsgs = function(msg) {
	console.log('cur msg length = ' + this.logMem.length);

	var now = new Date();
	if((this.logMem.length-this.unsavedPos)<ex.cfg.log.limit 
		&& (now.getTime()-this.unsavedTime.getTime())<ex.cfg.log.timeout*60*1000) return;
	
	this.saveUnsavedMsgs();	
	this.unsavedTime = now;
}
Team.prototype.saveUnsavedMsgs = function() {
	var team = this;
	console.log('saving msg from/to = '+this.unsavedPos+'/'+(this.logMem.length-1))
	var r = this.logStream.write('\n' + this.logMem.slice(this.unsavedPos).map(function(m){return m.toFileFmt()}).join("\n"));
	this.unsavedPos = this.logMem.length;
	console.log(this.tid + ' saved with ' + r);
	return r;
}
Team.prototype.broadcast = function(type,data) {
	var pids = this.group.pids;
	this.mpids.forEach(function(mpid){
		var emp = pids[mpid];
		if(!emp) return;
		emp.socks.forEach(function(ws){ ws.sendJSON(type,data); });
	})
}


var fileCount;
function saveAllUnsavedMsg() {
  console.log('It\'s about to stop IM server, so save the msg cache to disk first.');
	fileCount = 0;
	for(var gid in gids) {
		var group = gids[gid];
		for(var tid in group.tids) {
			var team = group.tids[tid];
			(function(tid){
				team.logStream.on('drain',function(err){
					console.log(this);
					fileCount--;
					console.log("unsavedCount--");
					// this.end(); if file not net, maybe is not necessary to call .end()
					this.destroy();
				});
			})(tid);			
			team.logStream.on('error',function(){
				console.log(tid+' file  stream error')
			})
			team.checkNewDay();
			var r = team.saveUnsavedMsgs();
			if(!r) {fileCount++;console.log('unsavedCount++');}
		}
	}
	// fileCount=0;
	setTimeout(checkAllClosed,0);
}
function checkAllClosed() {
	console.log("fileCount="+fileCount);
	if(fileCount) { setTimeout(checkAllClosed,100); return; }
	console.log('All unsaved messages have been saved to disk now.\nJust Quit.');
	process.exit(0);
}
exports.saveAllUnsavedMsg = saveAllUnsavedMsg;
// process.on('exit', saveAllUnsavedMsg);
try {
	process.on('SIGINT',saveAllUnsavedMsg); // ctrl-c
	process.on('SIGQUIT',saveAllUnsavedMsg);
	process.on('SIGTERM',saveAllUnsavedMsg); // kill
} catch(e) {
	console.log(process.arch);
	console.log(process.platform);
}

function Emp(group,pid) {
	this.group = group;
	this.pid = pid;
	this.socks = [];
}
Emp.prototype.bindSock = function(ws) {
	var socks = this.socks, len = socks.length;
	for(var i=0;i<=len;i++) {
		if(socks[i]===ws) break;
		if(i===len) socks.push(ws);
	}
	return this;
}
Emp.prototype.unbindSock = function(ws) {
	var socks = this.socks;
	for(var i=socks.length-1;i>=0;i--) if(socks[i]===ws) socks.splice(i,1);
	if(socks.length>0) return false;
	delete this.group.pids[ws.emp.pid];
	return true;
}
/*
function BoundEmp(gid,pid) {
	this.gid = gid;
	this.pid = pid;
}
exports.BoundEmp = BoundEmp;
*/

function Msg(seq,pid,msg,marked) {
	this.seq = seq;
	this.pid = pid;
	this.msg = msg;
	this.marked = marked;
	this.date = new Date();
}
Msg.prototype.toFileFmt = function() {
	var m = this;
	return JSON.stringify([ex.hlp.to_char(m.date,'hh:mi:ss'),m.pid,m.msg,m.marked?1:0]);
}
	
/*
file system design
./logs/gid/tid/yyyymm/dd.log
*/