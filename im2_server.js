require('./bulkImport.js');

var WebSocket = require("websocket")
 ,	WebSocketServer = WebSocket.server
 ,	WSConnection = WebSocket.connection
 ,	wss
 ,	Handler = require('./msg_handler.js')
 ,	cfg = require('./cfg.js')
 ,	http = require('http')
 ,	data = require("./data.js")
 ,	dbeHandler = require("./dbe_handler.js")
 ,	URL = require("url")
 ,	qstr = require("querystring")
 ;

var server = http.createServer(function(req, res) {
    console.log((new Date()) + " Received request for " + req.url);
    res.writeHead(200);
		var url = URL.parse(req.url,true);
		if(url.pathname==='/dbchange') 
			if(url.query.type in dbeHandler) dbeHandler[url.query.type](url.query.data);
			else console.log("unknown event type !");
    res.end();
});

var repeatCount=0;
function listen() {
	try {
		server.listen(8080, function() {
		    console.log((new Date()) + " Server is listening on port " + cfg.servicePort);
		});
	} catch(e) {
		console.log(e);
		console.log(e.code)
		if(++repeatCount>=3) return;
		if(e.code==="EADDRINUSE") { console.log("repeat");setTimeout(listen,1000); }
	}
}
listen();

server.on("error1",function(e){
	
})

WSConnection.prototype.sendJSON = function(type,data) {
	this.sendUTF(JSON.stringify({type:type,data:data}));	
}

wss = new WebSocketServer({
    httpServer: server,
    autoAcceptConnections: true,
    maxReceivedFrameSize: 64*1024*1024,	 // 64MiB
    maxReceivedMessageSize: 64*1024*1024, // 64MiB
    fragmentOutgoingMessages: false,
    keepalive: true,
    disableNagleAlgorithm: false
});

wss.on('connect',function(ws)
{	
	console.log('new connection arrived');
  var handler = new Handler(ws);
  // for websocket draft 10
  ws.on("message", function (message) {
		console.log("received message from websocket");
  	console.log('msg',message.utf8Data);
    msg = JSON.parse(message.utf8Data);
    handler[msg.type](msg.data);
  });
  ws.on("close", function () { 
    // emitted when server or client closes connection
    console.log("close");
		handler.close();
  });
});

process.on('exit', function () {
	console.log('exiting');
});

var wss2 = require("./ws_extend.js");
wss2.createServer(function(ws) 
{
	var handler = new Handler(ws);
	ws.on("data", function (msg) { 
		console.log('msg',msg);
	  msg = JSON.parse(msg);
	  handler[msg.type](msg.data);
	});
	ws.on("connect", function (resource) {
		console.log('\n\n resource='+resource);
	});
	ws.on("close", function () { 
	  // emitted when server or client closes connection
	  console.log("close");
		handler.close();
});

}).listen(cfg.servicePort+1);
